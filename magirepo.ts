export const name = 'watcher - magirepo'
import { Context } from 'koishi-core'
import * as watcher from './index'
import axios, { AxiosResponse } from 'axios'

let inside: number
let outside: number
let inver: number

async function leak(this: watcher.state, raw: string) {
    let int: number = parseInt(this.value)
    if (inver === null) inver = int
    else if (int !== inver) return
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
    inver = int + 1
    this.logger.debug("Magirepo pre-release: %d", inver)
    this.ctx.sender.sendGroupMsgAsync(inside, url + "[CQ:image,file=" + url + "]")
}

function release(this: watcher.state, raw: string) {
    const url = "https://magireco.com/images/comic2/image/" + this.value + ".jpg"
    let int: number = parseInt(this.value)
    if (int !== inver) {
        inver = int
        this.before(raw)
    }
    this.ctx.sender.sendGroupMsgAsync(outside, url + "[CQ:image,file=" + url + "]")
}

export function apply (ctx: Context, argv) {
    inside = argv.inside
    outside = argv.outside
    ctx.plugin(watcher.apply, {
        name: "magirepo",
        interval: [
            "*/15 * * * * *",
            { hour: 16, dayOfWeek: 2, minute: [15, 30, 45, 47, 49, 51, 53, 55, 56, 57, 58, 59], tz: 'Asia/Tokyo' },
            { hour: 15, dayOfWeek: 2, minute: [5, 15, 30, 45], tz: 'Asia/Tokyo' }
        ],
        url: "https://magireco.com/comic2/",
        reg: /current = (\d+)/,
        after: release,
        before: leak
    })
}