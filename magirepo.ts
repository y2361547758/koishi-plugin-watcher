export const name = 'watcher - magirepo'
import { Context } from 'koishi-core'
import * as watcher from './index'
import axios, { AxiosResponse } from 'axios'
import * as schedule from 'node-schedule'

class magirepo extends watcher.state {
    inside: number
    outside: number
    inver: number = null
    async after(raw: string) {
        const url = "https://magireco.com/images/comic2/image/" + this.value + ".jpg"
        let int: number = parseInt(this.value)
        if (int !== this.inver) {
            this.inver = int
            this.before(raw)
        }
        this.ctx.sender.sendGroupMsgAsync(this.outside, url + "[CQ:image,file=" + url + "]")
    }
    async before(raw: string) {
        let int: number = parseInt(this.value)
        if (this.inver === null) this.inver = int
        else if (int !== this.inver) return
        let res: AxiosResponse<string>
        const url = "https://jp.rika.ren/magica/resource/image_web/page/collection/magirepo/img/part2/magirepo_02_" + (int + 1) + ".png?" + (new Date).getTime()
        try {
            res = await axios.head(url)
        } catch (e) {
            if (e.response) {
                this.logger.debug(e.response)
                this.logger.error("Internet error: %d", e.response.status)
            } else this.logger.error(e)
            return
        }
        this.logger.debug(res)
        if (res.headers['content-type'] !== "image/png") {
            this.logger.debug("not found")
            return
        }
        this.inver = int + 1
        this.logger.debug("Magirepo pre-release: %d", this.inver)
        this.ctx.sender.sendGroupMsgAsync(this.inside, url + "[CQ:image,file=" + url + "]")
    }
    constructor (ctx: Context, inside: number, outside: number) {
        super(ctx, {
            url: "https://magireco.com/comic2/",
            reg: /current = (\d+)/,
            name: "magirepo",
            interval: undefined
        })
        this.inside = inside
        this.outside = outside
    }
}

export function apply (ctx: Context, argv) {
    let stat = new magirepo(ctx, argv.inside, argv.outside)
    const interval = [
        "0 0 * * * *",
        { hour: 16, dayOfWeek: 2, minute: [15, 30, 45, 47, 49, 51, 53, 55, 56, 57, 58, 59], tz: 'Asia/Tokyo' },
        { hour: 15, dayOfWeek: 2, minute: [5, 15, 30, 45], tz: 'Asia/Tokyo' }
    ]
    for (const i of interval) schedule.scheduleJob(i, stat.job)
    stat.update(true)
}