# koishi-plugin-watcher

基于 node-schedule/Koishi/cqhttp/酷Q 的，一个简单的监视器插件

## 简介

基本设计就是GET一个url，用正则取出必要部分，在内存中记录，在下次请求后比较是否变化，然后推送到指定QQ（用户/群/讨论组）

请求时机由node-schedule托管，推荐使用cron风格定义，支持多组时间

支持注入三个函数：请求行为、更新行为、未更新行为，当然要是你三个都要注入不如直接另外写一个插件

注意本插件启动时会请求一次目标来初始化内存值

## 参数

| 参数 | 类型 | 举例 | 注释 |
|:----:|:---:|:----:|:----:|
| name | string | `test` | 监视名，用于区分命名空间 |
| interval | any | `"0 0 * * * *"` | 以 schedule 配置多个周期，非空 |
| url | string | `https://play.google.com/store/apps/details?id=com.aniplex.magireco` | 需要查询的url，非空 |
| reg | RegExp | `/>(\d\.\d\.\d)</` | 用于匹配的正则表达式，非空 |
| update | updateFunc | 见`index.ts` | 拉取更新的自定义函数 |
| after | callbackFunc | 见`index.ts` | 有更新时调用的函数，默认推送至target里的QQ对象 |
| before | callbackFunc | 见`magirepo.ts` | 无更新时调用的函数，默认无操作 |
| target | dict | `{ discuss: [], private: [], group: [] }` | 推送目标，仅供默认after函数调用 |

当 `interval` 为 `string[]` 时，插件将遍历 `interval` 并将所有项目都传入 `schedule` 创建一个计划（考虑直接改为`any[]`，以及支持定义分钟周期）

## 参考 koishi 配置

~~~js
module.exports = {
  type: "ws",
  server: "ws://localhost:6700",
  plugins: [
    // 其他插件
    ["./watcher/magirepo.ts", { inside: 208339341, outside: 208339341 }], // 自定义更新、无更新行为，详见magirepo.ts
    ["./koishi-plugin-watcher", {          // 基本使用，每个小时请求一次谷歌play检查版本号是否更新，然后推送到我的账号上
      name: "gplay",
      interval: "0 0 * * * *",
      url: "https://play.google.com/store/apps/details?id=com.aniplex.magireco",
      reg: />(\d+\.\d+\.\d+)</,
      target: { private: [2361547758] }
    }]
  ]
}
~~~

## 使用

1. 安装[koishi](https://koishi.js.org/)

2. 下载本项目`git clone https://github.com/y2361547758/koishi-plugin-watcher.git`

3. cd koishi-plugin-watcher && npm install

4. 配置koishi`koishi init`，在plugin中加入`./koishi-plugin-watcher`及配置

5. 依次启动酷Q和koishi，`koishi run -- -r ts-node/register`
