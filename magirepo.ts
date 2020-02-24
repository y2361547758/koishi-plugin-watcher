export const name = 'watcher - magirepo'
import { Context } from 'koishi-core'
import * as watcher from './index'
import axios, { AxiosResponse } from 'axios'

let inside: number
let outside: number
let inver: number

async function leak(ctx: Context, name: string, num: string) {
    let int: number = parseInt(num)
    if (inver === null) inver = int
    else if (int !== inver) return
    let res: AxiosResponse<string>
    const url = "https://android.magi-reco.com/magica/resource/image_web/page/collection/magirepo/img/part2/magirepo_02_" + (int + 1) + ".png"
    try {
        res = await axios.head(url)
    } catch (e) {
        if (e.response) {
            watcher.memory[name].logger.debug(e.response)
            watcher.memory[name].logger.error("Internet error: %d", e.response.status)
        } else watcher.memory[name].logger.error(e)
        return
    }
    if (res.headers['content-type'] !== "image/png") {
        watcher.memory[name].logger.debug("not found")
        return
    }
    inver = int + 1
    watcher.memory[name].logger.debug("Magirepo pre-release: %d", inver)
    ctx.sender.sendGroupMsgAsync(inside, url + "[CQ:image,file=" + url + "]")
}

function release(ctx: Context, name: string, num: string) {
    const url = "https://magireco.com/images/comic2/image/" + num + ".jpg"
    ctx.sender.sendGroupMsgAsync(outside, url + "[CQ:image,file=" + url + "]")
}

export function apply (ctx: Context, argv) {
    inside = argv.inside
    outside = argv.outside
    ctx.plugin(watcher.apply, {
        name: "magirepo",
        interval: [
            "0 0 * * * *",
            { hour: 16, dayOfWeek: 2, minute: [45, 47, 49, 51, 53, 55, 56, 57, 58, 59], tz: 'Asia/Tokyo' }
        ],
        url: "https://magireco.com/comic2/",
        reg: /current = (\d+)/,
        after: release,
        before: leak
    })
}