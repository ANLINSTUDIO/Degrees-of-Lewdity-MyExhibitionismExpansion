window.mee = {};




/* ====================================== */
/*                 初始化                 */
/* ====================================== */
// 初始化常量
mee.展开附近衣服延迟 = 100;
mee.额外禁止放衣区域 = [
    "Settings", "Attitudes", "Simple Mirror",
    "Wardrobe", "Changing Room", "Bed", "Sleep",
    "Clothing Shop", "Forest Shop", "School Library Shop", "Adult Shop Store",
    "PillCollection", "Sextoys Inventory", "Mirror", "Containers", "Bath",
    "Bus seat",
    "Storm Drain Entrance", "Drain Exit", "Drain Water", "Drain Exit"   // 下水道
];
mee.额外安全放衣区域 = [
    "Shopping Centre", "Shopping Centre Top",
    "Bus",
    "Bathroom",
];
mee.随机刷衣概率百分之 = 5;
// 多调用初始化变量
mee.startup = function() {
    V.safeAreaForClothes = V.safeAreaForClothes || [];
    V.safeAreaForClothesTemp = V.safeAreaForClothesTemp || [];
    V.wardrobesground = V.wardrobesground || {};

    V.desire = V.desire ?? 500;
    V.satisfaction = V.satisfaction ?? 100;

    V.taskstat = V.taskstat ?? 0;
    V.mee_masturbationstatflag = V.mee_masturbationstatflag ?? V.masturbationstat;
    V.mee_taskstatflag = V.mee_taskstatflag ?? 0;
};
mee.initwardrobesground = function(place) {
    V.wardrobesground[place] = V.wardrobesground[place] || {
        "face": [],
        "feet": [],
        "hands": [],
        "handheld": [],
        "head": [],
        "legs": [],
        "lower": [],
        "neck": [],
        "over_head": [],
        "over_lower": [],
        "over_upper": [],
        "genitals": [],
        "under_lower": [],
        "under_upper": [],
        "upper": [],
        "unlocked": false,
        "shopSend": false,
        "transfer": false,
        "isolated": true,
        "locationRequirement": [],
        "space": 10000,
        "outside": true,
        "name": "地面"
    }
    if (V.passage === place) {
        V.wardrobesground[place].outside = !!V.outside;
    }
    if (place === 'Carried') {
        V.wardrobesground[place].outside = false;
        V.wardrobesground[place].name = "随身空间";
        
    }
    return V.wardrobesground[place]
};




/* ====================================== */
/*                注入原版                */
/* ====================================== */
// 分钟流逝
mee.of$minutePassed = function(minutes) {
    // == 满足系统 ==============================
        // 不使用 mee.startup(); 避免处理太多
        V.desire = V.desire ?? 0;
        let _desiremod = 0;

        // 基础减少
        _desiremod -= 0.1;
        // 满足感低持续增加欲望
        if (V.satisfaction < 800) {
            _desiremod += (800 - V.satisfaction) / 100 / 5;
        } else {
            _desiremod -= 1;
        }
        // 性奋高欲望值高
        _desiremod += (V.arousal / V.arousalmax) * 10;

        mee.addDesire(_desiremod * minutes);  
};
// 小时流逝
mee.of$hourPassed = function(hours) {
    mee.startup();

    // == 调整地面掉落衣物湿度 ====================
        const keys = ["upper", "under_upper", "lower", "under_lower"];
        for (const place in V.wardrobesground) {
            const wardrobes = V.wardrobesground[place];
            const outside = wardrobes.outside;
            const rain = ["rain", "snow"].includes(Weather.precipitation);
            keys.forEach(key => {
                wardrobes[key].forEach(clothes => {
                    if (clothes.wet) {
                        let mod = 0;
                        if (outside) {
                            if (rain) {
                                mod = 100 * hours;
                            } else {
                                mod = -100 * hours;
                            }
                        } else {
                            mod = -50 * hours;
                        }
                        clothes.wet = Math.clamp(clothes.wet + mod, 0, 200);
                        console.log(`MEE| [${place} passed ${hours}h] ${clothes.name} 已${mod > 0 ? '淋湿' : '干燥'}: ${Math.abs(mod)}; 当前湿度: ${clothes.wet}`)
                    }
                })
            })
        }
};
// 天流逝
mee.of$dayPassed = function() {
    mee.startup();
    
    // == 满足系统 ==============================
        // 满足感处理（基础-50，本日高潮数+10*5，任务完成数+10*n, ……）
        mee.setSatisfaction(Math.round(  Math.max(0, V.satisfaction 
            - 50 
            + Math.min((V.masturbationstat - (V.mee_masturbationstatflag??V.masturbationstat)) * 10, 50)
            + ((V.taskstat??0) - (V.mee_taskstatflag??0)) * 10
        )));

        // 记录数据
        V.mee_masturbationstatflag = V.masturbationstat;
        V.mee_taskstatflag = V.taskstat;
    
    // == 随处脱衣 ==============================
        // 删除掉落衣服
        Object.keys(V.wardrobesground).forEach(place => {
            const clothes = V.wardrobesground[place];
            for (const slot in clothes) {
                if (Array.isArray(clothes[slot])) {
                    clothes[slot] = clothes[slot].filter(clothes_obj => !clothes_obj.discarded);
                }
            }
        })
};
// 玩家高潮
mee.om$orgasm = function() {
    mee.setDesire(V.desire / 2);
    mee.setSatisfaction(V.satisfaction + 1);
};


/* ====================================== */
// 【工具】注入游戏函数，在调用原函数后再执行指定的功能。
mee.onFunction = function(originalFn, afterFn) {
    return new Proxy(originalFn, {
        apply: function(target, thisArg, argumentsList) {
            const result = target.apply(thisArg, argumentsList);
            afterFn(...argumentsList);
            return result;
        }
    });
};
// 【工具】注入游戏宏，在调用原宏后再执行指定的功能。
mee.onMacro = function(macroName, afterFn) {
    let originalMacro = Macro.get(macroName);
    if (originalMacro) {
        let oldHandler = originalMacro.handler;
        Macro.delete(macroName);
        Macro.add(macroName, {
            handler: function () {
                oldHandler.apply(this, arguments);
                afterFn.apply(this, arguments);
            }
        });
    }
};
// 【工具】自动处理函数和宏的注入，请使用of$和om$来进行使用，请确保与原函数或宏重名。
$(document).one(":passageinit", function () {
    // 自动处理 of$ 前缀：绑定到全局同名函数
    Object.keys(mee).forEach(key => {
        if (key.startsWith('of$')) {
            const funcName = key.slice(3);
            eval(`${funcName} = mee.onFunction(${funcName}, mee['of$' + '${funcName}'])`);
            console.log(`MEE| [auto] 已注入 of$: ${funcName}`);
        }
    });
    // 自动处理 om$ 前缀：使用 onMacro 注入宏
    Object.keys(mee).forEach(key => {
        if (key.startsWith('om$')) {
            const macroName = key.slice(3);
            mee.onMacro(macroName, mee[key]);
            console.log(`MEE| [auto] 已注入 om$ 宏: ${macroName}`);
        }
    });
    console.log("MEE| [passageinit] 已自动完成所有函数/宏注入");
});
/* ====================================== */




/* ====================================== */
/*                随处脱衣                */
/* ====================================== */
// 【获取】是否是可存放衣服的地点。包括游戏定义的主要区域、额外安全放衣区域 和 玩家自定义的安全区域。
mee.isSafeAreaForClothes = function() {
    const isSafeAreaForClothes = [...setup.majorAreas, ...mee.额外安全放衣区域, ...(V.safeAreaForClothes??[])].includes(V.passage) || document.querySelector("#额外安全放衣区域");
    return isSafeAreaForClothes;
};
// 【获取】当前地点是否被限制禁止存放衣服。这类地点通常是设置、衣柜、服装店、事件等位置。
mee.isProhibitAreaForClothes = function() {
    const isProhibitAreaForClothes = mee.额外禁止放衣区域.includes(V.passage) || document.querySelector("#额外禁止放衣区域");
    return isProhibitAreaForClothes;
};
// 【获取】当前是否处于事件、遭遇战、自慰以及事件完成状态。这类状态通常应该被限制禁止存放衣服。
mee.isInEvent = function() {
    return V.event !== undefined || V.combat === 1 || V.masturbating === 1 || V.passage.endsWith( "Finish");
};
// 【设置】新增玩家自定义的安全区域。为确保玩家能够重复到达，需要玩家离开后再次到达此处。通过 V.safeAreaForClothesTemp 记录。
mee.addSafeAreaForClothes = function() {
    if (T.safeAreaForClothesTempFlag == 1) {
        return
    }
    mee.startup();
    if (!V.safeAreaForClothes.includes(V.passage)) {
        if (V.safeAreaForClothesTemp.includes(V.passage)) {
            V.safeAreaForClothesTemp.splice(V.safeAreaForClothesTemp.indexOf(V.passage), 1);
            SugarCube.Dialog.setup("你真的确定要 允许在这里存放你的衣服 吗？");
            SugarCube.Dialog.wiki(`
                <div>确认后此处（${V.passage}）将可以存放衣服，且非作弊情况只能回到这里拿取。</div>
                <small>使用英语仔细确认："${V.passage}" 是否为<span class="red">随时可以访问</span>的段落而非<span class="red">特殊段落</span>，即: 是否是由于特殊条件触发的段落。请务必谨慎，<span class="red">看起来虽然是同一个地方但段落名不同，衣服不会共享！</span>
                <div class="red">如果开启后你无法回到此处，可以前往 [选项] > [请别露出惊讶的表情好吗] > [随处脱衣] > [取回衣物] 进行拿取。</div>
                <ul class="buttons">
                    <li><button id="customdesc-ok" type="button" role="button" tabindex="0">确认</button></li>
                    <li><button id="customdesc-cancel" class="ui-close">取消</button></li>
                </ul>
            `);
            SugarCube.Dialog.open();
            $('#customdesc-ok').one('click', () => {
                V.safeAreaForClothes.push(V.passage);
                Wikifier.wikifyEval(`<<updatesidebardescription>>`);
                SugarCube.Dialog.close();
            });
            $('#customdesc-cancel').one('click', () => {
                SugarCube.Dialog.close();
            });
        } else {
            V.safeAreaForClothesTemp.push(V.passage);
            T.safeAreaForClothesTempFlag = 1;
            const button = document.querySelector("#mee-add-safe-area-for-clothes-button");
            button.innerHTML = "为了确保此处你可以重复达到，请在离开后再次回到这里"
            button.parentElement.disabled = true;
        }
    }
};

// 【工具】展平衣物对象，对象类似于 V.worn 槽位对应单个衣物，也可以类似于 衣柜 槽位对应多个衣物数组。可以排除遗弃衣物。会自动排除套装附件。
mee.flattenClothes = function(clothes_raw, exclude_discarded=false) {

    function _(key, clothesObj, items) {
        if (clothesObj.index === 0) {  // 赤裸排除
            return;
        }
        if (exclude_discarded && clothesObj.discarded) {  // 排除遗弃
            return;
        }
        if (clothesObj.outfitPrimary) {
            for (const outfitKey in clothesObj.outfitPrimary) {
                outfits[key] = [...(outfits[key]??[]), {
                    name: clothesObj.name, 
                    colours: [clothesObj.colour, clothesObj.accessory_colour, clothesObj.pattern], 
                    id: clothes.length}];
                }
        } else if (clothesObj.outfitSecondary) {
            const type = clothesObj.outfitSecondary[0];
            const outfit_index = outfits[type]?.findIndex((outfit) => {
                return (
                    outfit.name === clothesObj.outfitSecondary[1] && 
                    outfit.colours[0] == clothesObj.colour &&
                    (clothesObj.accessory === 0 || outfit.colours[1] == clothesObj.accessory_colour) &&
                    (clothesObj.pattern === undefined || outfit.colours[2] == clothesObj.pattern)
                );
            });
            if (outfit_index !== undefined && outfit_index > -1) {
                clothes[outfits[type][outfit_index].id].outfit = true;
                outfits[type].splice(outfit_index, 1);
                return;
            }
        }
        const clothesObjReturn = {
            id: clothes.length,  //  即列表中索引
            type: key,  // 为衣柜中type键
            clothes: clothesObj,
            outfit: false,
            discarded: clothesObj.discarded ?? false,
        }
        if (items) {
            clothesObjReturn.index = items.findIndex((item) => item === clothesObj);  // 为衣柜中type对象内的索引
        }
        clothes.push(clothesObjReturn);
    }

    const clothKeys = [
        'upper', 'under_upper', 
        'head', 'face', 'neck',
        'hands', 'handheld', 
        'lower', 'under_lower',
        'legs', 'feet'
        
    ];
    const clothes = [];
    const outfits = {};
    clothKeys.forEach(key => {
        const items = clothes_raw[key];
        if (Array.isArray(items)) {
            items.forEach(clothesObj => {
                _(key, clothesObj, items);
            })
        } else {
            _(key, items, null);
        }
    })
    return clothes;
};
// 【设置】使玩家穿上或脱下衣服。需要地点衣柜，可以设置自定义衣柜，如随身衣柜。自动保存和加载衣物湿度。
mee.setClothes = function(slot, clothes, place=null) {
    if (place === null) place = V.passage;
    mee.startup();
    V.wardrobes.ground = mee.initwardrobesground(place);
    let wardrobe_location = V.wardrobe_location;
    V.wardrobe_location = "ground";
    V["wear_"+slot] = clothes;

    mee.saveWet();

    Wikifier.wikifyEval(`
        <<wardrobewear>>
    `);
    V.wardrobe_location = wardrobe_location;
    V.wardrobesground[place] = V.wardrobes.ground;

    mee.loadWet();

    T.clothesChanged = 1;
    Wikifier.wikifyEval(`
        <<updatesidebarimg>>
        <<updatesidebardescription>>
        <<updateallure>>
        <<updatewarmthscale>>
        <<exposure>>
        <<run updateMoment()>>
    `);
    window.Dynamicest?.LoadStats();
};
// 【设置】使玩家穿上nearbyClothes中的衣服。仅供<<clothingCaptionButton>>使用，因其定义了T.nearbyClothes。穿上的衣服会自动删去遗弃属性。
mee.getClothes = function(worn_id) {
    const nearbyClothes = T.nearbyClothes[worn_id]
    if (nearbyClothes.clothes.discarded) nearbyClothes.clothes.discarded = false;
    mee.setClothes(nearbyClothes.type, nearbyClothes.index)
};
// 【设置】移除玩家指定槽位的衣服。需要在安全区域。
mee.removeClothes = function(slot) {
    if (mee.isSafeAreaForClothes()) {
        mee.setClothes(slot, "strip")
    }
};
// 【设置】取回指定地点指定的掉落衣物，需要指定 slot(key, type) 和 其在其地点衣柜中对应slot的数组中的索引。
mee.takeBackClothes = function(place, worn_type, worn_index) {
    const clothes = V.wardrobesground[place][worn_type][worn_index];
    V.wardrobesground[place][worn_type].splice(worn_index, 1);
    V.wardrobe[worn_type].push(clone(clothes));
    Wikifier.wikifyEval(`<<replace '#meemodsettingtackback'>><<meemodsettingtackback>><</replace>>`);
};
// 【设置】取回指定地点所有的掉落衣物，不包括遗弃衣物。
mee.takeBackClothesAll = function(place) {
    const groundclothes = mee.getGroundClothes(place);
    if (groundclothes) {
        groundclothes.forEach(clothes => {
            if (!clothes.clothes.discarded) {
                V.wardrobe[clothes.type].push(clone(clothes.clothes));
            }
        })
        delete V.wardrobesground[place]
        Wikifier.wikifyEval(`<<replace '#meemodsettingtackback'>><<meemodsettingtackback>><</replace>>`);
    }
};
// 【获取】当前玩家身上穿的衣物，会自动排除套装附件。要获取完整的对象，请使用 V.worn。
mee.getOnClothes = function() {
    mee.startup();
    mee.saveWet();
    const clothes = mee.flattenClothes(V.worn, false);
    if (clothes.length == 0) {
        return null;
    }
    return clothes;
};
// 【获取】指定地点的掉落衣物，会自动排除套装附件。可以排除遗弃衣物。要获取完整的对象，请使用 V.wardrobesground[place]。
mee.getGroundClothes = function(place, exclude_discarded=false) {
    mee.startup();
    let wardrobesground = V.wardrobesground[place];
    if (wardrobesground) {
        const clothes = mee.flattenClothes(wardrobesground, exclude_discarded);
        if (clothes.length == 0) {
            delete V.wardrobesground[place];
            return null;
        }
        return clothes;
    }
    return null;
};
// 【获取】当前地点附近的掉落衣物。同时刷新出遗弃衣物。
mee.getNearbyClothes = function(random_refresh=true) {
    if (mee.isSafeAreaForClothes()) {
        if (random_refresh && !['Bedroom'].includes(V.passage)) {
            if (Math.random() <= mee.随机刷衣概率百分之 / 100) {
                const keys = [
                    'head', 'face', 'neck',
                    'upper', 'under_upper', 
                    'hands', 'handheld', 
                    'lower', 'under_lower',
                    'legs', 'feet'
                ];

                // 1. 计算所有 slot 的有效物品总数（跳过索引 0）
                let total = 0;
                for (let slot of keys) {
                    const clothes = setup.clothes[slot];
                    if (clothes && clothes.length > 1) {
                        total += clothes.length - 1;
                    }
                }

                // 2. 随机选择一个偏移量
                let rand = Math.floor(Math.random() * total);

                // 3. 根据偏移量定位到具体的 slot 和 索引
                let selectedSlot = null;
                let selectedIndex = -1;
                for (let slot of keys) {
                    const clothes = setup.clothes[slot];
                    if (!clothes || clothes.length <= 1) continue;
                    const count = clothes.length - 1; // 有效物品数量
                    if (rand < count) {
                        selectedSlot = slot;
                        selectedIndex = rand + 1; // 索引 0 为占位，有效索引从 1 开始
                        break;
                    } else {
                        rand -= count;
                    }
                }

                // 4. 获取选中物品并设置属性
                const random_clothes_object = setup.clothes[selectedSlot][selectedIndex];
                if (random_clothes_object && random_clothes_object.cost > 0 && !random_clothes_object.type.includes("strap-on")) {
                    const clothes_object = clone(random_clothes_object);
                    // 可磨损物品
                    if (["upper", "under_upper", "lower", "under_lower"].includes(clothes_object.slot) || (clothes_object.slot === "face" && clothes_object.type.includesAny("face_covering", "gag", "mask"))) {
                        clothes_object.integrity = 1 + Math.floor(Math.random() * 29);
                    }
                    // 可打湿物品 户外雨天淋湿处理
                    if (["upper", "under_upper", "lower", "under_lower"].includes(clothes_object.slot) && ["rain", "snow"].includes(Weather.precipitation) && V.outside === 1) {
                        clothes_object.wet = 200;
                    }
                    console.log(`掉落临时随机衣服：${clothes_object.name}，完整度：${clothes_object.integrity}`);
                    mee.setGroundClothes(V.passage, clothes_object, null, null, null, true);
                }
            }
        }
    }
    // 同步当前地点户外性
    mee.initwardrobesground(V.passage);
    return mee.getGroundClothes(V.passage);
};
// 【设置】指定地点的掉落衣物，能够自动补全套装，默认参数时随机颜色或图案。
// 测试示例：mee.setGroundClothes(V.passage, setup.clothes["upper"].find((a)=>a.name=="sundress"))
mee.setGroundClothes = function(place, clothes, colour=null, accessory=null, pattern=null, discarded=false) {
    mee.startup();
    const slot = clothes.slot;
    mee.initwardrobesground(place);

    // 处理颜色
    let clothes_colour = 0;
    if (colour === null) {
        const colour_options = clothes.colour_options.filter((c) => c !== "custom");
        clothes_colour = colour_options[Math.floor(Math.random() * (colour_options.length))] ?? 0;
    } else {
        clothes_colour = colour;
    }
    // 处理配件颜色
    let clothes_accessory_colour = 0;
    if (clothes.accessory === 1) {
        if (accessory === null) {
            const accessory_colour_options = clothes.accessory_colour_options.filter((c) => c !== "custom");
            clothes_accessory_colour = accessory_colour_options[Math.floor(Math.random() * (accessory_colour_options.length))] ?? 0;
        } else {
            clothes_accessory_colour = accessory;
        }
    }
    // 处理图案
    let clothes_pattern = 0;
    if (clothes.pattern_options) {
        if (pattern === null) {
            clothes_pattern = clothes.pattern_options[Math.floor(Math.random() * (clothes.pattern_options.length))] ?? 0;
        } else {
            clothes_pattern = pattern;
        }
    }

    const clothes_object = clone(clothes);
    clothes_object.colour = clothes_colour;
    if (clothes_object.accessory === 1) { clothes_object.accessory_colour = clothes_accessory_colour };
    if (clothes_object.pattern === 0) { clothes_object.pattern = clothes_pattern };
    clothes_object.discarded = discarded;
    clothesDataTrimmer(clothes_object);
    V.wardrobesground[place][slot].push(clothes_object);

    // 处理套装
    if (clothes.outfitPrimary) {
        Object.keys(clothes.outfitPrimary).forEach(key => {
            const slot_outfit = key;
            const clothes_outfit = setup.clothes[slot_outfit].find((clothes_obj)=>clothes_obj.name===clothes.outfitPrimary[slot_outfit]);
            if (clothes_outfit) {
                const clothes_object = clone(clothes_outfit);
                clothes_object.colour = clothes_colour;
                if (clothes_object.accessory === 1) { clothes_object.accessory_colour = clothes_accessory_colour };
                if (clothes_object.pattern === 0) { clothes_object.pattern = clothes_pattern };
                clothes_object.discarded = discarded;
                clothesDataTrimmer(clothes_object);
                console.log(`添加衣服套装补偿：${clothes_object.name}`);
                V.wardrobesground[place][slot_outfit].push(clothes_object);
            }
        })
    } else if (clothes.outfitSecondary) {
        const slot_outfit = clothes.outfitSecondary[0];
        const clothes_outfit = setup.clothes[slot_outfit].find((clothes_obj)=>clothes_obj.name===clothes.outfitSecondary[1]);
        if (clothes_outfit) {
            const clothes_object = clone(clothes_outfit);
            clothes_object.colour = clothes_colour;
            if (clothes_object.accessory === 1) { clothes_object.accessory_colour = clothes_accessory_colour };
            if (clothes_object.pattern === 0) { clothes_object.pattern = clothes_pattern };
            clothes_object.discarded = discarded;
            clothesDataTrimmer(clothes_object);
            console.log(`添加衣服套装补偿：${clothes_object.name}`);
            V.wardrobesground[place][slot_outfit].push(clothes_object);
        }
    }
};
// 【工具】仅供<<clothingCaptionButton>>使用，作为clothing-caption-button的onclick函数，自动根据随身打开状态实现操作。
mee.clothingCaptionButtonClick = function(get, arg) {
    if (T.currentOverlay === "carriedclothes") {
        if (get) {
            mee.putToCarried(T.nearbyClothes[arg].type, T.nearbyClothes[arg].index);
        } else {
            mee.putToCarried(arg);
        }
    } else {
        if (get) {
            mee.getClothes(arg);
        } else {
            mee.removeClothes(arg);
            if (arg === "handheld") {
                mee.getCarrySpace();  // 检测是否丢弃背包并且执行衣物掉落
            }
        }
    }
};

// 【获取】当前湿度等级。
mee.getWetStage = function(wetnessValue) {
	if (wetnessValue >= 100) return 3;
	if (wetnessValue >= 80) return 2;
	if (wetnessValue >= 40) return 1;
	return 0;
};
// 【设置】将当前湿度保存至穿上的衣物中。
mee.saveWet = function() {
    Object.keys(V.worn).forEach(key => {  // 保存湿度
        const relkey = key.replace("_", "");
        if (V[relkey+"wet"] && V[relkey+"wet"] > 0) {
            V.worn[key].wet = V[relkey+"wet"];
        } else {
            delete V.worn[key].wet
        }
    })
};
// 【设置】从当前穿上的衣物中读取湿度。
mee.loadWet = function() {
    Object.keys(V.worn).forEach(key => {  // 恢复湿度
        const relkey = key.replace("_", "");
        if (V.worn[key].wet) {
            V[relkey+"wet"] = V.worn[key].wet;
            V[relkey+"wetstage"] = mee.getWetStage(V.worn[key].wet);
        } else {
            V[relkey+"wet"] = 0;
            V[relkey+"wetstage"] = 0;
        }
    })
    wikifier("<<updatesidebarimg false>>");
};

// 【获取】当前随身空间
mee.getCarrySpace = function() {
    let space = 2;
    if (V.worn.handheld.type.includes('bookbag')) {
        space = 7;
    }
    mee.initwardrobesground("Carried");

    // 检查背包溢出
    const carriedClothes = mee.getGroundClothes("Carried");
    const isFull = carriedClothes ? carriedClothes.length >= space : false;
    if (isFull) {
        for (let index = carriedClothes.length-1; index >= space; index--) {
            const clothes = carriedClothes[index];
            V.wardrobesground["Carried"][clothes.type].splice(clothes.index, 1);
            mee.initwardrobesground(V.passage);
            V.wardrobesground[V.passage][clothes.type].push(clothes.clothes);
        }
        Wikifier.wikifyEval("<<updatesidebardescription>>");
    }

    return [space, isFull];
};
// 【设置】将指定衣物保存到随身衣柜。
mee.putToCarried = function(slot, index=null) {
    const [carriedClothes, isFull] = mee.getCarrySpace("Carried");
    if (carriedClothes && isFull) {
        mee.showTip(`随身空间已满${V.worn.handheld.type.includes('bookbag')?"":"，携带背包以提升空间"}。`);
    } else {
        mee.initwardrobesground("Carried");
        let clothes;
        if (index !== null) {
            clothes = V.wardrobesground[V.passage][slot][index];
        } else {
            clothes = V.worn[slot];
        }
        if (mee.checkIfCanCarry(clothes)) {
            if (index !== null) {
                V.wardrobesground[V.passage][slot].splice(index, 1);
                V.wardrobesground["Carried"][slot].push(clothes);
                Wikifier.wikifyEval("<<updatesidebardescription>>");
            } else {
                mee.setClothes(slot, "strip", "Carried");
            }
            Wikifier.wikifyEval("<<replace #customOverlayContent>><<carriedclothes>><</replace>>")
        } else {
            mee.showTip("该物品无法放入随身空间。");
        }
    }
}
// 【获取】指定衣物是否可放入随身空间。通常，背包不允许放入随身空间。
mee.checkIfCanCarry = function(clothes) {
    return !clothes.type.includes('bookbag');
};
// 【工具】在侧边栏显示提示并高亮。
mee.showTip = function(text) {
    T.tipChanged = true;
    Wikifier.wikifyEval(`<<updatesidebardescription>>`);
    $("#clothing-caption-tip")
        .text(text)
        .css("animation", "highlight 1s ease 1")
};
// 【设置】从随身衣柜穿上衣物。
mee.getClothesFromCarried = function(worn_id) {
    const nearbyClothes = T.carriedClothes[worn_id]
    mee.setClothes(nearbyClothes.type, nearbyClothes.index, "Carried");
    Wikifier.wikifyEval("<<replace #customOverlayContent>><<carriedclothes>><</replace>>")
};




/* ====================================== */
/*                满足系统                */
/* ====================================== */
// 【获取】当前勇气值，返回0-1000的两位小数。勇气值由满足感作为基础，由欲望和醉酒进行修正。
mee.courage = function() {
    mee.startup();
    let courage = V.satisfaction;
    let mod = 1;  // 修正值

    // 欲望修正
    // 高欲望时 勇气↑、镇静↓ ，低欲望时反之
    mod += (V.desire - 500) / 500;
    // 醉酒修正
    mod += (V.drunk / 1000) * 2;

    return Math.round(  Math.clamp(courage * Math.max(mod, 0), 0, 1000)  *100)/100;
}
// 【获取】当前勇气值等级，返回0-4的整数。
mee.couragelevel = function() {
    let courage = mee.courage();
    if (courage < 200) {
        return 0;
    } else if (courage < 400) {
        return 1;
    } else if (courage < 600) {
        return 2;
    } else if (courage < 800) {
        return 3;
    } else {
        return 4;
    }
}
// 【获取】当前勇气的修改值，返回0-40的整数。在hasSexStat的判定过程中，将此值加入范围0-100的statValue，对其进行加成。
mee.courageStatModifier = function() {
	return mee.couragelevel() * 10;
}
// 【获取】当前镇静值，返回0-1000的两位小数。镇静值由满足感作为基础，由欲望和醉酒进行修正。
mee.calm = function() {
    mee.startup();
    let calm = V.satisfaction;
    let mod = 1;  // 修正值

    // 欲望修正
    // 高欲望时 勇气↑、镇静↓ ，低欲望时反之
    mod -= (V.desire - 500) / 500;
    // 醉酒修正
    mod -= (V.drunk / 1000) * 1;

    return Math.round(  Math.clamp(calm * Math.max(mod, 0), 0, 1000)  *100)/100;
}
// 【获取】当前镇静值等级，返回0-4的整数。
mee.calmlevel = function() {
    let calm = mee.calm();
    if (calm < 200) {
        return 0;
    } else if (calm < 400) {
        return 1;
    } else if (calm < 600) {
        return 2;
    } else if (calm < 800) {
        return 3;
    } else {
        return 4;
    }
}
// 【获取】当前镇静的修改值，返回0.2-1.0的小数。在pain、arousal、stress的属性更值过程中，将此值乘入最终的更改值，对其进行减免。
mee.calmStatModifier = function() {
    return 1.0 / (mee.calmlevel()+1);
}
// 【设置】当前欲望值，自动将其限制为0-1000的两位小数。要获取欲望值，请使用 V.desire。
mee.setDesire = function(value) {
    V.desire = Math.round(  Math.clamp(value, 1, 1000)  *100)/100;
}
// 【设置】增加当前欲望值，自动将其限制为0-1000的两位小数。
mee.addDesire = function(value) {
    mee.setDesire((V.desire??500) + value)
}
// 【设置】当前满足感，自动将其限制为0-1000的两位小数。要获取满足感，请使用 V.satisfaction。
mee.setSatisfaction = function(value) {
    V.satisfaction = Math.round(  Math.clamp(value, 0, 1000)  *100)/100;
}
// 【设置】增加当前满足感，自动将其限制为0-1000的两位小数。
mee.addSatisfaction = function(value) {
    mee.setSatisfaction((V.satisfaction??100) + value)
}




/* ====================================== */
/*                排泄系统                */
/* ====================================== */
// 【获取】当前时段是否已经排泄。一天的不同时段，每次均只能进行一次排泄。
mee.getexcretes = function() {
    if (V.daily.excretes) {
        return V.daily.excretes.includes(Time.dayState);
    }
    return false;
}
// 【设置】在当前时段进行排泄。
mee.excrete = function() {
    if (!V.daily.excretes) {
        V.daily.excretes = [];
    }
    V.daily.excretes.push(Time.dayState);
}