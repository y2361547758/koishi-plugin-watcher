export const name = 'watcher'
import { Context, Logger, MessageType } from 'koishi-core'
import axios from 'axios'
import * as schedule from 'node-schedule'

declare type updateFunc = (ctx: Context, name:string, url: string, reg: RegExp, after: callbackFunc, before?: callbackFunc) => void
declare type callbackFunc = (ctx: Context, name: string, value: string) => void
class config {
    name: string            // 名字，构建命名空间
    interval: any           // 以 schedule 配置多个周期
    url: string             // 查询url
    reg: RegExp             // 匹配正则
    update?: updateFunc     // 拉取更新的自定义函数
    after?: callbackFunc    // 有更新时调用的函数
    before?: callbackFunc   // 无更新时调用的函数
                            // 如果谁把这三个函数都重载了，建议直接另外写个独立插件
    target?: {              // 更新推送目标
        discuss: number[]
        private: number[]
        group: number[]
    }
}

export let memory: {
    logger: Logger
    value: string
    target: {
        discuss: number[],
        private: number[],
        group: number[]
    }
}[] = []

export function sendmsg(ctx: Context, name:string, msg: string): void {
    memory[name].logger.debug("msg: " + msg)
    for (const i in memory[name].target) for (const j of memory[name].target[i]) {
        ctx.sender.sendMsgAsync(<MessageType>i, j, msg)
        memory[name].logger.debug("send message to: %s_%d", i, j)
    }
}

export function after(ctx: Context, name:string, value: string) {
    sendmsg(ctx, name, value)
}

async function update(ctx: Context, name: string, url: string, reg: RegExp, after: callbackFunc, before?: callbackFunc) {
    let res
    memory[name].logger.debug("[" + new Date().toISOString() + "]" + "Job start")
    try {
        res = await axios.get<string>(url)
    } catch (e) {
        if (e.response) {
            memory[name].logger.debug(e.response.data)
            memory[name].logger.error("Internet error: %d", e.response.status)
        } else memory[name].logger.error(e)
        return
    }
    const r = reg.exec(res.data)
    if (r) {
        memory[name].logger.debug(r[0])
        if (memory[name].value != r[1]) {
            memory[name].logger.debug("Old value: " + memory[name].value)
            memory[name].value = r[1]
            memory[name].logger.info("New value: " + memory[name].value)
            after(ctx, name, memory[name].value)
        } else {
            memory[name].logger.debug("not update: " + memory[name].value)
            if (before) before(ctx, name, memory[name].value)
        }
    } else {
        memory[name].logger.debug(res.data)
        memory[name].logger.warn("Match nothing")
    }
    memory[name].logger.debug("[" + new Date().toISOString() + "]" + "Job end")
}

export function apply (ctx: Context, argv: config) {
    if (!argv.url || !argv.reg) return
    argv.interval = argv.interval || "0 * * * * *"
    memory[argv.name] = {
        logger: ctx.logger("watcher:" + argv.name),
        value: null,
        target: argv.target ? {
            discuss : argv.target.discuss || [],
            private : argv.target.private || [],
            group   : argv.target.group   || []
        } : { discuss: [], private: [], group: [] }
    }
    argv.after = argv.after || after
    argv.update = argv.update || update

    const job: schedule.JobCallback = (fireDate: Date) => {
        argv.update(ctx, argv.name, argv.url, argv.reg, argv.after, argv.before)
    }
    if (Array.isArray(argv.interval)) {
        for (const i of argv.interval) schedule.scheduleJob(i, job)
    // } else if (typeof argv.interval === "number") {
    //     "not support"
    } else {
        schedule.scheduleJob(argv.interval, job)
    }
    // let lastUpdate: Date
    // ctx.receiver.on('heartbeat', (meta) => {
    //     logger.debug(meta)
    //     const now = new Date()
    //     if (now.getTime() - lastUpdate.getTime() >= argv.interval) {
    //         lastUpdate = new Date()
    //         job(new Date())
    //     }
    // })
    // job(new Date())
    argv.update(ctx, argv.name, argv.url, argv.reg, () => {})
}