export const name = 'watcher - magirepo'
import { Context } from 'koishi-core'
import * as watcher from './index'
import axios, { AxiosResponse } from 'axios'

let inside: number = 208339341
let outside: number = 208339341
let inver: number

async function leak(ctx: Context, num: string) {
    let int: number = parseInt(num)
    if (inver === null) inver = int
    else if (int !== inver) return
    let res: AxiosResponse<string>
    const url = "https://android.magi-reco.com/magica/resource/image_web/page/collection/magirepo/img/part2/magirepo_02_" + (int + 1) + ".png"
    try {
        res = await axios.head(url)
    } catch (e) {
        if (e.response) {
            watcher.logger.debug(e.response)
            watcher.logger.error("Internet error: %d", e.response.status)
        } else watcher.logger.error(e)
        return
    }
    if (res.headers['content-type'] !== "image/png") {
        watcher.logger.debug("not found")
        return
    }
    inver = int + 1
    watcher.logger.debug("Magirepo pre-release: %d", inver)
    ctx.sender.sendGroupMsgAsync(inside, url + "[CQ:image,file=" + url + "]")
}

function release(ctx: Context, num: string) {
    const url = "https://magireco.com/images/comic2/image/" + num + ".jpg"
    ctx.sender.sendGroupMsgAsync(outside, url + "[CQ:image,file=" + url + "]")
}

export function apply (ctx: Context) {
    ctx.plugin(watcher.apply, {
        intercal: [
            "0 45,47,50-59 15 * * 2",
            "0 0 * * * *",
        ],
        url: "https://magireco.com/comic2/",
        reg: /current = (\d+)/,
        after: release,
        before: leak
    })
}