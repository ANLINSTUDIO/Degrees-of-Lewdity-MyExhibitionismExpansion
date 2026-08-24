window.mee = {};
mee.展开附近衣服延迟 = 100;
mee.额外禁止放衣区域 = [
    "Settings", "Attitudes",
    "Wardrobe", "Changing Room", "Bed",
    "Clothing Shop", "Forest Shop", "School Library Shop", "Adult Shop Store",
    "PillCollection", "Sextoys Inventory", "Mirror", "Containers", "Bath"
];
mee.额外安全放衣区域 = [
    "Shopping Centre", "Shopping Centre Top",
    "Bus",
    "Bathroom"
];

// 初始化
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

// 注入原版函数
mee.onFunction = function(name, func) {
    new Proxy(window[name], {
        apply: function(target, thisArg, argumentsList) {
            let result = target.apply(thisArg, argumentsList);
            func.apply(thisArg, argumentsList);
            return result;
        }
    });
};
mee.onMacro = function(name, func) {
    let originalMacro = Macro.get(name);
    if (originalMacro) {
        let oldHandler = originalMacro.handler;
        Macro.delete(name);
        Macro.add(name, {
            handler: function () {
                oldHandler.apply(this, arguments);
                func.apply(this, arguments);
            }
        });
    }
};

minutePassed = new Proxy(minutePassed, {
    apply: function(target, thisArg, argumentsList) {
        mee.minutePassed(...argumentsList);
        return target.apply(thisArg, argumentsList);
    }
});
dayPassed = new Proxy(dayPassed, {
    apply: function(target, thisArg, argumentsList) {
        mee.dayPassed(...argumentsList);
        return target.apply(thisArg, argumentsList);
    }
});
$(document).one(":passageinit", function () {
    mee.onMacro("orgasm", mee.orgasm);
});


// 衣服操作
mee.setClothes = function(slot, clothes){
    mee.startup();
    V.wardrobes.ground = V.wardrobesground[V.passage] || {
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
        "name": "地面"
    };
    let wardrobe_location = V.wardrobe_location;
    V.wardrobe_location = "ground";
    V["wear_"+slot] = clothes;
    Wikifier.wikifyEval(`
        <<wardrobewear>>
    `);
    V.wardrobe_location = wardrobe_location;
    V.wardrobesground[V.passage] = V.wardrobes.ground;
    T.clothesChanged = 1;
    Wikifier.wikifyEval(`
        <<updatesidebarimg>>
        <<updatesidebardescription>>
        <<updateallure>>
        <<updatewarmthscale>>
        <<exposure>>
        <<run updateMoment()>>
    `);
    Dynamicest?.LoadStats();
};
mee.removeClothes = function(slot){
    if (mee.isSafeAreaForClothes()) {
        mee.setClothes(slot, "strip")
    }
};
mee.getClothes = function(worn_id) {
    const nearbyClothes = T.nearbyClothes[worn_id]
    mee.setClothes(nearbyClothes.type, nearbyClothes.index)
};
mee.takeBackClothes = function(place, worn_type, worn_index) {
    const clothes = V.wardrobesground[place][worn_type][worn_index];
    V.wardrobesground[place][worn_type].splice(worn_index, 1);
    V.wardrobe[worn_type].push(clone(clothes));
    Wikifier.wikifyEval(`<<replace '#meemodsettingtackback'>><<meemodsettingtackback>><</replace>>`);
};
mee.takeBackClothesAll = function(place) {
    const groundclothes = mee.getGroundClothes(place);
    if (groundclothes) {
        groundclothes.forEach(clothes => {
            V.wardrobe[clothes.type].push(clone(clothes.clothes));
        })
        delete V.wardrobesground[place]
        Wikifier.wikifyEval(`<<replace '#meemodsettingtackback'>><<meemodsettingtackback>><</replace>>`);
    }
};
mee.getOnClothes = function() {
    mee.startup();
    const clothKeys = [
        'over_head', 'head', 'face', 'neck',
        'over_upper', 'upper', 'under_upper', 
        'hands', 'handheld', 
        'over_lower', 'lower', 'under_lower',
        'genitals', 'legs', 'feet'
        
    ];
    const clothes = [];
    const outfits = {};
    clothKeys.forEach(key => {
        const clothesObj = V.worn[key];
        if (clothesObj.index !== 0) {
            if (clothesObj.outfitPrimary) {
                outfits[key] = [...(outfits[key]??[]), {name: clothesObj.name, colour: clothesObj.colour, id: clothes.length}];
            } else if (clothesObj.outfitSecondary) {
                const type = clothesObj.outfitSecondary[0];
                const outfit = outfits[type]?.findIndex((outfit) => outfit.name === clothesObj.outfitSecondary[1] && outfit.colour === clothesObj.colour);
                if (outfit !== undefined && outfit > -1) {
                    clothes[outfits[type][outfit].id].outfit = true;
                    outfits[type].splice(outfit, 1);
                    return;
                }
            }
            clothes.push({
                id: clothes.length,
                type: key,
                clothes: clothesObj,
                outfit: false
            });
        }
    })
    if (clothes.length == 0) {
        return null;
    }
    return clothes;
};
mee.getGroundClothes = function(place) {
    mee.startup();
    let wardrobesground = V.wardrobesground[place];
    if (wardrobesground) {
        const clothKeys = [
            'over_head', 'head', 'face', 'neck',
            'over_upper', 'upper', 'under_upper', 
            'hands', 'handheld', 
            'over_lower', 'lower', 'under_lower',
            'genitals', 'legs', 'feet'
            
        ];
        const clothes = [];
        const outfits = {};
        clothKeys.forEach(key => {
            const items = wardrobesground[key];
            if (Array.isArray(items)) {
                let i = 0;
                items.forEach(clothesObj => {
                    if (clothesObj.outfitPrimary) {
                        outfits[key] = [...(outfits[key]??[]), {name: clothesObj.name, colour: clothesObj.colour, id: clothes.length}];
                    } else if (clothesObj.outfitSecondary) {
                        const type = clothesObj.outfitSecondary[0];
                        const outfit = outfits[type]?.findIndex((outfit) => outfit.name === clothesObj.outfitSecondary[1] && outfit.colour === clothesObj.colour);
                        if (outfit !== undefined && outfit > -1) {
                            clothes[outfits[type][outfit].id].outfit = true;
                            outfits[type].splice(outfit, 1);
                            return;
                        }
                    }
                    clothes.push({
                        id: clothes.length,  //  即列表中索引
                        index: items.findIndex((item) => item === clothesObj),  // 为衣柜中type对象内的索引
                        type: key,  // 为衣柜中type键
                        clothes: clothesObj,
                        outfit: false
                    });
                    i++;
                })
            }
        })
        if (clothes.length == 0) {
            delete V.wardrobesground[place];
            return null;
        }
        return clothes;
    }
    return null;
};
mee.getNearbyClothes = function() {
    return mee.getGroundClothes(V.passage);
};

// 安全可存放衣服处
mee.isSafeAreaForClothes = function() {
    const isSafeAreaForClothes = [...setup.majorAreas, ...mee.额外安全放衣区域, ...(V.safeAreaForClothes??[])].includes(V.passage) || document.querySelector("#额外安全放衣区域");
    return isSafeAreaForClothes;
}
mee.isProhibitAreaForClothes = function() {
    const isProhibitAreaForClothes = mee.额外禁止放衣区域.includes(V.passage) || document.querySelector("#额外禁止放衣区域");
    return isProhibitAreaForClothes;
}
mee.isInEvent = function() {
    return V.event !== undefined || V.combat === 1 || V.masturbating === 1 || V.passage.endsWith( "Finish");
}
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
}

// 满足系统
mee.courage = function() {
    mee.startup();
    let courage = V.satisfaction;
    let mod = 1;  // 修正值

    // 欲望修正
    // 高欲望时 勇气↑、镇静↓ ，低欲望时反之
    mod += (V.desire - 500) / 500;

    return Math.round(  Math.max(0, Math.min(1000, courage * mod))  *100)/100;
}
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
mee.courageStatModifier = function() {
	return mee.couragelevel() * 10;
}
mee.calm = function() {
    mee.startup();
    let calm = V.satisfaction;
    let mod = 1;  // 修正值

    // 欲望修正
    // 高欲望时 勇气↑、镇静↓ ，低欲望时反之
    mod -= (V.desire - 500) / 500;

    return Math.round(  Math.max(0, Math.min(1000, calm * mod))  *100)/100;
}
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
mee.calmStatModifier = function() {
    return 1.0 / (mee.calmlevel()+1);
}
mee.setDesire = function(value) {
    V.desire = Math.round(  Math.max(1, Math.min(1000, value))  *100)/100;
}
mee.addDesire = function(value) {
    mee.setDesire((V.desire??500) + value)
}
mee.setSatisfaction = function(value) {
    V.satisfaction = Math.round(  Math.max(0, Math.min(1000, value))  *100)/100;
}
mee.addSatisfaction = function(value) {
    mee.setSatisfaction((V.satisfaction??100) + value)
}

mee.minutePassed = function(minutes) {
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
}
mee.dayPassed = function() {
    mee.startup();
    
    // 满足感处理（基础-50，本日高潮数+10*5，任务完成数+10*n, ……）
    mee.setSatisfaction(Math.round(  Math.max(0, V.satisfaction 
        - 50 
        + Math.min((V.masturbationstat - (V.mee_masturbationstatflag??V.masturbationstat)) * 10, 50)
        + ((V.taskstat??0) - (V.mee_taskstatflag??0)) * 10
    )));

    // 记录数据
    V.mee_masturbationstatflag = V.masturbationstat;
    V.mee_taskstatflag = V.taskstat;
}
mee.orgasm = function() {
    mee.setDesire(V.desire / 2);
    mee.setSatisfaction(V.satisfaction + 1);
}