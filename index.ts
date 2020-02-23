export const name = 'watcher'
import { Context, Logger, MessageType } from 'koishi-core'
import axios from 'axios'
import * as schedule from 'node-schedule'

declare type updateFunc = (ctx: Context, url: string, reg: RegExp, after: callbackFunc, before?: callbackFunc) => void
declare type callbackFunc = (ctx: Context, value: string) => void
class config {
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

export let logger: Logger
let memory: string
export let target: {
    discuss: number[],
    private: number[],
    group: number[]
}

export function sendmsg(ctx: Context, msg: string): void {
    logger.debug("msg: " + msg)
    for (const i in target) for (const j of target[i]) {
        ctx.sender.sendMsgAsync(<MessageType>i, j, msg)
        logger.debug("send message to: %s_%d", i, j)
    }
}

export function after(ctx: Context, value: string) {
    sendmsg(ctx, value)
}

async function update(ctx: Context, url: string, reg: RegExp, after: callbackFunc, before?: callbackFunc) {
    let res
    try {
        res = await axios.get<string>(url)
    } catch (e) {
        if (e.response) {
            logger.debug(e.response.data)
            logger.error("Internet error: %d", e.response.status)
        } else logger.error(e)
        return
    }
    logger.debug(res.data)
    const r = reg.exec(res.data)
    if (r) {
        logger.debug("Match: " + r[1])
        if (memory != r[1]) {
            memory = r[1]
            logger.debug("New value: " + memory)
            after(ctx, memory)
        } else {
            logger.debug("not update: " + memory)
            if (before) before(ctx, memory)
        }
    } else logger.warn("Match nothing")
}

export function apply (ctx: Context, argv: config) {
    if (!argv.url || !argv.reg) return
    argv.interval = argv.interval || "0 * * * * *"
    target = argv.target ? {
        discuss : argv.target.discuss || [],
        private : argv.target.private || [],
        group   : argv.target.group   || []
    } : { discuss: [], private: [], group: [] }

    argv.after = argv.after || after
    argv.update = argv.update || update
    logger = ctx.logger("watcher")

    const job: schedule.JobCallback = (fireDate: Date) => {
        logger.debug("[" + fireDate.toISOString() + "]" + "Job start")
        argv.update(ctx, argv.url, argv.reg, argv.after, argv.before)
        logger.debug("[" + new Date().toISOString() + "]" + "Job end")
    }
    if (Array.isArray(argv.interval) && typeof argv.interval[0] === "string") {
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
    argv.update(ctx, argv.url, argv.reg, () => {})
}