export const name = 'watcher'
import { Context, Logger, MessageType } from 'koishi-core'
import axios, { AxiosResponse } from 'axios'
import * as schedule from 'node-schedule'

/**
 * @param init 是否是初始化
 */
declare type updateFunc = (init?: boolean) => Promise<void>
/**
 * @param raw 请求返回的原始内容
 */
declare type callbackFunc = (raw?: string) => Promise<void>
class config {
    name: string            // 名字，构建命名空间
    interval: any           // 以 schedule 配置多个周期
    url: string             // 查询url
    reg: RegExp             // 匹配正则
    update?: updateFunc     // 拉取更新的自定义函数，必须异步
    after?: callbackFunc    // 有更新时调用的函数，可选异步
    before?: callbackFunc   // 无更新时调用的函数，可选异步
                            // 如果谁把这三个函数都重载了，建议直接另外写个独立插件
    target?: {              // 更新推送目标
        discuss: number[]
        private: number[]
        group: number[]
    }
}

async function after(this: state, raw: string) {    // 有更新时调用的函数
    this.logger.debug("msg: " + this.value)
    for (const i in this.target) for (const j of this.target[i]) {
        this.ctx.sender.sendMsgAsync(<MessageType>i, j, this.value)
        this.logger.debug("send message to: %s_%d", i, j)
    }
}
export class state {
    logger: Logger | Console = console
    value: string = null
    target: {
        discuss: number[],
        private: number[],
        group: number[]
    }
    url: string             // 查询url
    reg: RegExp             // 匹配正则
    ctx: Context            // CQ上下文
    after: callbackFunc = after
    before: callbackFunc = null
    constructor (ctx: Context, argv: config) {
        this.url = argv.url
        this.reg = argv.reg
        this.ctx = ctx
        this.logger = ctx.logger("watcher:" + argv.name)
        this.target = argv.target ? {
            discuss : argv.target.discuss || [],
            private : argv.target.private || [],
            group   : argv.target.group   || []
        } : { discuss: [], private: [], group: [] }
        if (argv.after) this.after = argv.after
        if (argv.before) this.before = argv.before
        if (argv.update) this.update = argv.update
    }
    async update (init = false) { // 拉取更新的自定义函数
        let res: AxiosResponse<string>
        this.logger.debug("[" + new Date().toISOString() + "]" + "Job start")
        try {
            res = await axios.get<string>(this.url)
        } catch (e) {
            if (e.response) {
                this.logger.debug(e.response.data)
                this.logger.error("Internet error: %d", e.response.status)
            } else this.logger.error(e)
            return
        }
        const r = this.reg.exec(res.data)
        if (r) {
            this.logger.debug(r[0])
            if (this.value != r[1]) {
                this.logger.debug("Old value: " + this.value)
                this.value = r[1]
                this.logger.info("New value: " + this.value)
                if (!init) await this.after(r[0])
            } else {
                this.logger.debug("not update: " + this.value)
                if (this.before) {
                    await this.before(r[0])
                }
            }
        } else {
            this.logger.debug(res.data)
            this.logger.warn("Match nothing")
        }
        this.logger.debug("[" + new Date().toISOString() + "]" + "Job end")
    }
    job: schedule.JobCallback = (fireDate: Date) => { this.update() }
}

export function apply (ctx: Context, argv: config) {
    if (!argv.url || !argv.reg) return
    argv.interval = argv.interval || "0 * * * * *"
    let stat = new state(ctx, argv)
    if (Array.isArray(argv.interval)) {
        for (const i of argv.interval) schedule.scheduleJob(i, stat.job)
    // } else if (typeof argv.interval === "number") {
    //     "not support"
    } else {
        schedule.scheduleJob(argv.interval, stat.job)
    }
    stat.update(true)
}