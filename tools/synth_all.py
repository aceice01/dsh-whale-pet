# synth_all.py — synthesize every pet line with Edge neural TTS.
# Voice + prosody are configurable via env: PET_VOICE, PET_RATE, PET_PITCH.
# Output base64 into audio.json.
import asyncio, json, base64, os
import edge_tts

VOICE = os.environ.get("PET_VOICE", "zh-CN-XiaoyiNeural")
RATE = os.environ.get("PET_RATE", "+8%")
PITCH = os.environ.get("PET_PITCH", "+12Hz")
OUT = "D:/Desktop/new/dsh-whale-pet/lib/audio.json"
TMP = "D:/Desktop/new/dsh-whale-pet/.tmp-audio.mp3"

LINES = {
    # coquetry (15)
    "coquetry0": "主人～摸摸我的头嘛～",
    "coquetry1": "人家好无聊呀～陪我玩嘛～",
    "coquetry2": "哼！不理你了……才怪～",
    "coquetry3": "主人主人～抱抱～",
    "coquetry4": "人家今天也很努力哦！",
    "coquetry5": "咦？你一直在偷看我吗～",
    "coquetry6": "好想吃小鱼干…啊不是，是投喂～",
    "coquetry7": "嘿嘿，主人最好了～",
    "coquetry8": "人家想听主人夸夸嘛～",
    "coquetry9": "主人快看！人家超乖的～",
    "coquetry10": "嗯哼～人家在呢！",
    "coquetry11": "主人摸摸头，烦恼全飞走～",
    "coquetry12": "人家的小尾巴摇呀摇～",
    "coquetry13": "今天也要和主人贴贴～",
    "coquetry14": "人家才没有偷懒，是在酝酿啦～",
    # running (10)
    "running0": "正在努力思考中…",
    "running1": "这个有点难，人家在想办法～",
    "running2": "马上就好啦！",
    "running3": "工具在手，天下我有～",
    "running4": "人家正在努力干活呢～",
    "running5": "别急别急，马上就有结果啦！",
    "running6": "代码在人家手里服服帖帖～",
    "running7": "再给人家一点点时间嘛～",
    "running8": "主人稍等，人家马上就好～",
    "running9": "加油加油，人家可以的！",
    # celebrate (10)
    "celebrate0": "任务完成啦！主人真棒！",
    "celebrate1": "搞定！夸夸人家嘛～",
    "celebrate2": "耶！工作做完啦！",
    "celebrate3": "全部搞定！人家厉害吧～",
    "celebrate4": "完美收工！撒花～",
    "celebrate5": "大成功！人家超开心的～",
    "celebrate6": "完成了完成了！快夸我～",
    "celebrate7": "一切顺利！主人快看结果～",
    "celebrate8": "收工收工！人家表现不错吧～",
    "celebrate9": "搞定收工！今晚加小鱼干嘛～",
    # sad (8)
    "sad0": "呜…刚才那步好像出错了…",
    "sad1": "人家有点难过…让主人担心了…",
    "sad2": "别急别急，人家再想想办法～",
    "sad3": "呜哇…这里出了点问题…",
    "sad4": "人家会努力的，再给次机会嘛～",
    "sad5": "有点小挫折，但人家不放弃！",
    "sad6": "主人别生气，人家马上修好～",
    "sad7": "呜呜…人家已经很认真了…",
    # todo (4)
    "todo0": "进度进展中，主人再等等哦～",
    "todo1": "还有几件事要做，主人再等等哦～",
    "todo2": "人家记着呢，任务还在进行中～",
    "todo3": "进度过半啦，胜利在望～",
    # misc
    "approval0": "需要主人批准啦～",
    "welcome0": "主人好～人家是鲸鱼娘！",
}

async def main():
    # resume: load existing clips so re-runs only synthesize missing lines
    results = {}
    if os.path.exists(OUT):
        with open(OUT, "r", encoding="utf-8") as f:
            existing = json.load(f)
        for k, v in existing.items():
            if isinstance(v, dict) and v.get("b64"):
                results[k] = v
        print(f"resuming: {len(results)} already done")
    todo = [(k, t) for k, t in LINES.items() if k not in results]
    print(f"to synthesize: {len(todo)}")
    for key, text in todo:
        for attempt in range(4):
            try:
                c = edge_tts.Communicate(text, VOICE, rate=RATE, pitch=PITCH)
                await c.save(TMP)
                with open(TMP, "rb") as f:
                    b64 = base64.b64encode(f.read()).decode("ascii")
                results[key] = {"b64": b64, "text": text, "bytes": len(b64) * 3 // 4}
                print(f"OK {key} ({results[key]['bytes']}B)")
                # save incrementally so a timeout keeps progress
                with open(OUT, "w", encoding="utf-8") as f:
                    json.dump(results, f, ensure_ascii=False)
                break
            except Exception as e:
                print(f"retry {key} ({attempt+1}): {e}")
                await asyncio.sleep(1)
        else:
            print(f"FAIL {key}: {text}")
    if os.path.exists(TMP):
        os.remove(TMP)
    total = sum(v["bytes"] for v in results.values())
    print(f"DONE: {len(results)} lines, {total/1024:.0f}KB, voice={VOICE} rate={RATE} pitch={PITCH}")

asyncio.run(main())
