/* Multi-Trip Management Layer v2.0
 * Overrides Component.prototype to support Japan & Iceland trips
 * Navigation: TripList -> TripDetail(overview/today/todo)
 * Exit: detail(today/todo) -> overview -> trip list (left edge swipe) */
(function(){
  'use strict';
  var CY='#00F0FF',MG='#FF2E88',BG='#0A0F1C',FG='#D8E6F0',MUTED='#9FB6C9',DIM='#5E7186';

  /* ===== CSS THEME VARIABLES =====
   * Ensure --zz-bg etc. are available even before ZZ_ADDON boots.
   * ZZ_ADDON defines these in a JS array that gets comma-joined via
   * textContent, corrupting some declarations. We define them cleanly here. */
  var __mtStyle=document.createElement('style');
  __mtStyle.id='zz-mt-theme';
  __mtStyle.textContent=':root{--zz-bg:#0A0F1C;--zz-panel:#0D1424;--zz-text:#D8E6F0;--zz-sub:#9FB6C9;--zz-dim:#5E7186;--zz-line:rgba(0,240,255,.3);--zz-cyan:#00F0FF;--zz-mag:#FF2E88}html.zz-light{--zz-bg:#F2F5F9;--zz-panel:#FFFFFF;--zz-text:#1D2A38;--zz-sub:#44586C;--zz-dim:#7A8CA0;--zz-line:rgba(0,120,140,.35);--zz-cyan:#0090A8;--zz-mag:#D81B6E}';
  if(document.head){document.head.appendChild(__mtStyle);}else{setTimeout(function(){document.head&&document.head.appendChild(__mtStyle);},50);}
  var MTK='zouzhe_multi_v2';

  /* ===== TRIP DEFINITIONS ===== */
  var TRIPS=[
    {id:'italy2026',title:'意大利 13 日',subtitle:'2026.09.24 - 10.06',cities:'罗马 / 索伦托 / 卡普里 / 佛罗伦萨 / 威尼斯 / 米兰',days:13,cover:'linear-gradient(160deg,#0B1230 0%,#131A3E 40%,#3B1252 78%,#6E1E4E 110%)',accent:'#FF2E88',statusLabel:'筹备中',hasData:true,country:'意大利'},
    {id:'japan2027',title:'日本 7 日',subtitle:'2027.02.14 - 02.20',cities:'东京 / 箱根 / 京都 / 奈良 / 大阪',days:7,cover:'linear-gradient(160deg,#0D0D1E 0%,#1A1436 45%,#3A1252 85%,#7A1E6E 115%)',accent:'#00F0FF',statusLabel:'筹备中',hasData:true,country:'日本'},
    {id:'iceland2027',title:'冰岛环岛 5 日',subtitle:'2027.07.15 - 07.19',cities:'雷克雅未克 / 南岸 / 冰河湖 / 北部 / 斯奈山',days:5,cover:'linear-gradient(160deg,#051A2E 0%,#0A3050 45%,#0F6E86 85%,#14B8A6 118%)',accent:'#14B8A6',statusLabel:'筹备中',hasData:true,country:'冰岛'}
  ];

  /* ===== JAPAN TRIP DATA (7 days, 2027 Spring Festival) ===== */
  function japanTrip(){
    var N=function(t,title,sub,x){return Object.assign({t:t,title:title,sub:sub||''},x||{});};
    var days=[
      {date:'2.14',wk:'日',city:'东京',sum:'北京飞东京 · 新宿入住',route:'北京 T3 → 成田 → 新宿',
       stay:{name:'Shinjuku Granbell Hotel',addr:'东京都新宿区歌舞伎町 2-14-5',tel:'+81 3 5155 2727'},
       dinner:{name:'新宿黄金街居酒屋 · 19:30',info:'歌舞伎町小巷内 · 随到随吃 · 人均 3000 円'},
       daily:['护照/在留卡随身','落地连接 eSIM 或租 WiFi 蛋','Suica 交通卡充值 3000 円','成田特快车票确认'],
       nodes:[
        N('09:30','CA1831 北京首都起飞','提前 3 小时到 T3',{tag:'✈',wc:'站内',rating:'—',tip:''}),
        N('13:45','降落成田机场 T1','入境+取行李约 1 小时',{wc:'站内',rating:'—',tip:''}),
        N('15:00','成田特快 N’EX → 新宿','约 80 分钟 · 车票约 3270 円',{tag:'🚄',note:'N’EX 往返票更划算',wc:'站内',rating:'—',tip:''}),
        N('16:30','新宿酒店入住','歌舞伎町步行 5 分钟',{addr:'Shinjuku Granbell Hotel, 2-14-5 Kabukicho, Shinjuku, Tokyo',tel:'+81 3 5155 2727',wc:'有',rating:'4.0',tip:'歌舞伎町步行5分钟到酒店'}),
        N('17:30','新宿御苑散步','冬季日落 17:00 · 已暗 · 灯景',{wc:'有',rating:'4.5',tip:'冬季日落17:00·已暗·灯景'}),
        N('19:30','黄金街居酒屋晚餐','200+ 小酒馆挤在一条巷子 · 选有日文菜单的',{wc:'有',rating:'4.0',tip:''}),
        N('21:00','回酒店休整','倒时差 · 明早 6 点起',{wc:'有',rating:'4.0',tip:'明早6点起'})]
      },
      {date:'2.15',wk:'一',city:'东京',sum:'浅草 · 上野 · 秋叶原',route:'新宿 ⇄ 浅草（地铁银座线）',
       stay:{name:'Shinjuku Granbell Hotel',addr:'东京都新宿区歌舞伎町 2-14-5',tel:'+81 3 5155 2727'},
       dinner:{name:'六歌灯烧鸟 · 19:00',info:'新宿忆来横丁 · 人均 2500 円'},
       daily:['浅草寺 7:00 前到（避开旅行团）','上野公园免费','秋叶原电子街傍晚逛','确认明日箱根周游券'],
       nodes:[
        N('06:30','地铁银座线 → 浅草','新宿站 20 分钟',{wc:'站内',rating:'—',tip:''}),
        N('07:00','浅草寺 · 雷门','清晨人少 · 仲见世通 9 点才开',{addr:'2-3-1 Asakusa, Taito, Tokyo',wc:'有',rating:'4.5',tip:'清晨人少·仲见世通9点才开'}),
        N('08:30','浅草今半 早餐','百年牛肉饭老店',{wc:'有',rating:'4.5',tip:'百年牛肉饭老店·早餐'}),
        N('10:00','地铁 → 上野','银座线 5 站',{wc:'站内',rating:'—',tip:''}),
        N('10:15','上野公园','免费 · 西乡隆盛像+国立博物馆外观',{wc:'有',rating:'4.5',tip:'免费·西乡隆盛像+国立博物馆外观'}),
        N('12:00','阿美横町午餐','上野市场街 · 海鲜饭/烤鸟 · 人均 1200 円',{addr:'Ameyoko, Ueno, Taito, Tokyo',wc:'有',rating:'4.0',tip:'上野市场街·海鲜饭/烤鸟·人均1200円'}),
        N('14:00','地铁日比谷线 → 秋叶原','2 站',{wc:'站内',rating:'—',tip:''}),
        N('14:15','秋叶原电气街','Yodobashi/Akiba 文化 · 女仆咖啡可选',{wc:'有',rating:'4.0',tip:'Yodobashi/Akiba文化·女仆咖啡可选'}),
        N('16:30','地铁回新宿','中央线 20 分钟',{wc:'站内',rating:'—',tip:''}),
        N('19:00','忆来横丁烧鸟晚餐','战后黑市氛围小巷 · 站着吃',{wc:'有',rating:'4.0',tip:'战后黑市氛围小巷·站着吃'}),
        N('21:00','回酒店','收拾行李 · 明天去箱根',{wc:'有',rating:'4.0',tip:''})]
      },
      {date:'2.16',wk:'二',city:'箱根',sum:'东京→箱根 · 大涌谷+芦之湖',route:'新宿 → 箱根汤谷（小田急浪漫号）',bag:true,bagLine:'携全部行李移动',
       stay:{name:'箱根绿之风 Ryokan',addr:'神奈川县足柄下郡箱根町汤本 152',tel:'+81 460 85 5711'},
       dinner:{name:'旅馆会席料理 · 18:30',info:'含温泉旅馆一泊二食 · 提前确认过敏'},
       daily:['小田急浪漫号车票确认','箱根周游券 2 日版购买','大涌谷缆车运营确认','旅馆到站时间告知'],
       nodes:[
        N('08:00','退房 · 新宿站小田急','小田急百货地下层乘车',{tag:'🧳',wc:'站内',rating:'—',tip:''}),
        N('09:00','浪漫号 7001 → 箱根汤谷','约 85 分钟 · 周游券含',{tag:'🚄',note:'指定席需另购 880 円',wc:'站内',rating:'4.0',tip:'指定席需另购880円'}),
        N('10:30','箱根汤谷温泉街','足汤免费 · 汤揉体验',{wc:'有',rating:'4.5',tip:'足汤免费·汤揉体验'}),
        N('11:00','登山电车 → 强罗','约 40 分钟',{tag:'🚃',wc:'站内',rating:'—',tip:''}),
        N('11:45','强罗午餐','强罗公园旁荞麦面',{wc:'有',rating:'4.0',tip:'强罗公园旁荞麦面'}),
        N('13:00','缆车 → 大涌谷','硫磺喷气 · 黑玉子蛋',{tag:'🚠',addr:'Owakudani, Hakone',wc:'站内',rating:'4.0',tip:'硫磺喷气·黑玉子蛋'}),
        N('14:30','缆车 → 桃源台','芦之湖全景',{wc:'站内',rating:'—',tip:'芦之湖全景'}),
        N('15:00','海盗船 → 箱根町港','湖上游船 30 分钟',{tag:'⛴',wc:'有',rating:'4.0',tip:'湖上游船30分钟'}),
        N('16:00','登山巴士 → 元箱根','箱根神社水鸟居',{wc:'有',rating:'—',tip:'箱根神社水鸟居'}),
        N('16:30','箱根神社参拜','拍照 · 生意兴隆',{addr:'80-1 Motohakone, Hakone',wc:'有',rating:'4.5',tip:'拍照·生意兴隆'}),
        N('17:30','巴士 → 旅馆','元箱根站上车约 15 分钟',{addr:'箱根绿之风 Ryokan, 汤本 152',tel:'+81 460 85 5711',wc:'站内',rating:'—',tip:''}),
        N('18:30','温泉 + 会席晚餐','先泡汤再吃饭 · 日式房间',{wc:'有',rating:'5.0',tip:'先泡汤再吃饭·日式房间'}),
        N('21:00','露天风吕夜景','星空下泡汤 · 早睡',{wc:'有',rating:'5.0',tip:'星空下泡汤·早睡'})]
      },
      {date:'2.17',wk:'三',city:'京都',sum:'箱根→京都 · 祇园花见小路',route:'箱根 → 小田原 → 新大阪 → 京都',bag:true,bagLine:'携全部行李移动',
       stay:{name:'Kyoto Travellers Inn',addr:'京都市东山区祇园町南侧 570-120',tel:'+81 75 533 3066'},
       dinner:{name:'祇园 京都料理 · 19:00',info:'八坂塔旁老町屋 · 怀石套餐 5000 円 · 需预约'},
       daily:['新干线车票确认','京都巴士一日券购买','祇园晚餐预约确认','旅馆到站时间告知'],
       nodes:[
        N('07:30','退房 · 登山电车回箱根汤谷','约 40 分钟',{tag:'🧳',wc:'站内',rating:'—',tip:''}),
        N('08:30','小田急 → 小田原','普通车 15 分钟',{wc:'站内',rating:'—',tip:''}),
        N('09:00','新干线 Nozomi 217 → 京都','约 2 小时 15 分',{tag:'🚄',note:'周游券不可坐 Nozomi · 需另购票',wc:'站内',rating:'—',tip:''}),
        N('11:20','到京都站 · 巴士到祇园','205 号巴士约 25 分钟',{wc:'站内',rating:'—',tip:''}),
        N('12:00','旅馆入住','祇园花见小路旁',{addr:'Kyoto Travellers Inn, 祇园町南侧 570-120',tel:'+81 75 533 3066',wc:'有',rating:'4.0',tip:'祇园花见小路旁·八坂塔旁老町屋'}),
        N('12:30','锦市场午餐','京都厨房 · 玉子烧/渍物试吃',{addr:'Nishiki Market, Kyoto',wc:'有',rating:'4.0',tip:'京都厨房·玉子烧/渍物试吃'}),
        N('14:00','清水寺','舞台结构 · 2 月梅花季',{tag:'🎫',addr:'1-294 Kiyomizu, Higashiyama, Kyoto',note:'门票 400 円',wc:'有',rating:'4.5',tip:'舞台结构·2月梅花季·门票400円'}),
        N('16:00','二年坂 · 三年坂','石板坡老街 · 抹茶冰淇淋',{wc:'有',rating:'4.0',tip:'石板坡老街·抹茶冰淇淋'}),
        N('17:00','八坂神社 · 圆山公园','夜灯亮起 · 红色灯笼',{wc:'有',rating:'4.5',tip:'夜灯亮起·红色灯笼'}),
        N('18:00','花见小路','艺伎出没花街 · 保持安静',{wc:'有',rating:'4.0',tip:'艺伎出没花街·保持安静'}),
        N('19:00','京都料理晚餐','町屋怀石 · 豆腐/汤叶/季节鱼',{note:'需预约 · 人均 5000 円',wc:'有',rating:'4.5',tip:'町屋怀石·豆腐/汤叶/季节鱼·人均5000円'}),
        N('21:00','回旅馆','步行 5 分钟',{wc:'有',rating:'4.5',tip:'步行5分钟'})]
      },
      {date:'2.18',wk:'四',city:'京都',sum:'伏见稻荷 · 岚山竹林',route:'京都站 ⇄ 伏见稻荷 / 岚山',
       stay:{name:'Kyoto Travellers Inn',addr:'京都市东山区祇园町南侧 570-120',tel:'+81 75 533 3066'},
       dinner:{name:'岚山吉兆 · 19:00',info:'渡月桥旁米其林怀石 · 人均 15000 円 · 需预约'},
       daily:['伏见稻荷 6:30 前到（千鸟谷人少）','岚山小火车确认班次','吉兆晚餐预约确认','回程 JR 确认'],
       nodes:[
        N('06:00','JR 奈良线 → 伏见稻荷','京都站 5 分钟',{wc:'站内',rating:'—',tip:''}),
        N('06:30','伏见稻荷大社 · 千本鸟居','清晨无人 · 拍完整鸟居隧道',{addr:'68 Yabunouchi Fukakusa, Fushimi, Kyoto',wc:'有',rating:'5.0',tip:'清晨无人·拍完整鸟居隧道'}),
        N('09:00','登顶稻荷山','往返约 2 小时 · 四之鸟居开始人少',{wc:'有',rating:'4.5',tip:'往返约2小时·四之鸟居开始人少'}),
        N('10:30','下山 · 京都站转车','JR 回京都站',{wc:'站内',rating:'—',tip:''}),
        N('11:00','嵯峨野小火车 → 岚山','龟冈出发 · 25 分钟 · 单程 880 円',{tag:'🚂',note:'提前购票 · 右侧座位看保津峡',wc:'站内',rating:'—',tip:''}),
        N('12:00','岚山午餐','汤豆腐料理 · 人均 2000 円',{wc:'有',rating:'4.0',tip:''}),
        N('13:30','竹林小径','高耸竹林 · 阳光穿过竹叶 · 拍照机位',{wc:'有',rating:'5.0',tip:'高耸竹林·阳光穿过竹叶·拍照机位'}),
        N('14:30','渡月桥','大堰川 · 远山雪景',{wc:'有',rating:'4.5',tip:'大堰川·远山雪景'}),
        N('15:00','天龙寺','曹源池庭园 · 世界遗产',{tag:'🎫',addr:'Suseki Saga Tenryuji, Kyoto',note:'门票 500 円',wc:'有',rating:'4.5',tip:'曹源池庭园·世界遗产·门票500円'}),
        N('17:00','法轮寺日落','渡月桥旁小丘 · 俯瞰岚山',{wc:'有',rating:'4.5',tip:'渡月桥旁小丘·俯瞰岚山'}),
        N('19:00','岚山吉兆晚餐','米其林三星怀石料理',{note:'⚠ 必须提前 1 个月预约 · 人均 15000 円+',wc:'有',rating:'5.0',tip:'必须提前1个月预约·人均15000円+'}),
        N('21:00','JR 回京都站','岚山站 · 20 分钟',{wc:'站内',rating:'—',tip:''})]
      },
      {date:'2.19',wk:'五',city:'奈良',sum:'京都→奈良→大阪 · 鹿公园+东大寺',route:'京都 → 奈良 → 大阪',bag:true,bagLine:'携全部行李移动',
       stay:{name:'Cross Hotel Osaka',addr:'大阪市中央区心斋桥筋 1-11-1',tel:'+81 6 6253 1111'},
       dinner:{name:'道顿堀章鱼烧+烧串 · 19:30',info:'随意逛街吃 · 人均 2000 円'},
       daily:['京都退房 8:00','奈良公园喂鹿带仙贝','东大寺大佛殿门票','大阪心斋桥酒店到站告知'],
       nodes:[
        N('08:00','退房 · JR → 奈良','约 45 分钟',{tag:'🧳',wc:'站内',rating:'—',tip:''}),
        N('09:00','到奈良 · 寄存行李','奈良站投币储物柜',{wc:'站内',rating:'—',tip:''}),
        N('09:30','奈良公园 · 喂鹿','买鹿仙贝 200 円 · 鹿会鞠躬',{wc:'有',rating:'4.5',tip:'买鹿仙贝200円·鹿会鞠躬'}),
        N('11:00','东大寺 · 大佛殿','世界最大木造建筑 · 奈良大佛',{tag:'🎫',addr:'406-1 Zoshicho, Nara',note:'门票 800 円',wc:'有',rating:'5.0',tip:'世界最大木造建筑·门票800円'}),
        N('12:30','奈良町午餐','老町家改的茶屋 · 柿叶寿司',{wc:'有',rating:'4.0',tip:'老町家改的茶屋·柿叶寿司'}),
        N('14:00','取行李 · JR → 大阪','约 40 分钟',{tag:'🧳',wc:'站内',rating:'—',tip:''}),
        N('15:00','大阪酒店入住','心斋桥地铁站步行 3 分钟',{addr:'Cross Hotel Osaka, 1-11-1 Shinsaibashisuji, Chuo, Osaka',tel:'+81 6 6253 1111',wc:'站内',rating:'—',tip:''}),
        N('16:30','大阪城公园','天守阁外观 · 免费区域拍照',{wc:'有',rating:'4.0',tip:'天守阁外观·免费区域拍照'}),
        N('18:00','道顿堀 · 心斋桥','固力果跑男霓虹招牌 · 螃蟹道乐',{wc:'有',rating:'4.5',tip:'固力果跑男霓虹招牌·螃蟹道乐'}),
        N('19:30','道顿堀章鱼烧+烧串','1810 总店 · 串炸 · 站着吃',{wc:'有',rating:'4.0',tip:'1810总店·串炸·站着吃'}),
        N('21:00','回酒店','收拾行李 · 明天最后一天',{wc:'有',rating:'4.0',tip:''})]
      },
      {date:'2.20',wk:'六',city:'大阪',sum:'大阪飞北京 · 黑门市场早餐',route:'大阪 → 关西机场 → 北京',bag:true,bagLine:'携全部行李 · 机场快线直达 T1',
       stay:null,dinner:null,
       daily:['退房 8:00','退税商品随身','登机 CA927','关西机场免税最后采购'],
       nodes:[
        N('08:00','退房 · 黑门市场早餐','生鲜/河豚汤/烤鸟 · 人均 1500 円',{wc:'站内',rating:'—',tip:''}),
        N('09:30','地铁 → 新大阪 · HARUKA','南海特急约 50 分钟 · 1390 円',{tag:'🚄',wc:'站内',rating:'—',tip:''}),
        N('10:30','关西机场 T1 值机','退税柜台先盖章',{tag:'✈',addr:'Kansai International Airport T1',wc:'站内',rating:'—',tip:'退税柜台先盖章'}),
        N('11:30','安检+出境','免税店最后采购',{wc:'站内',rating:'—',tip:'免税店最后采购'}),
        N('13:30','CA927 起飞','约 3 小时到北京',{wc:'有',rating:'—',tip:'退税随身·免税柜台先盖章'}),
        N('16:30','到北京首都 T3','',{wc:'有',rating:'—',tip:'到达北京'})]
      }
    ];
    days.forEach(function(d,i){d.n=i+1;d.nodes.forEach(function(nd){if(nd.sm==null){var m=nd.t.match(/(\d{1,2}):(\d{2})/);nd.sm=m?(+m[1])*60+(+m[2]):0;}});});
    return days;
  }

  function japanArt(){
    return {
      '东京':{s:[86,58,'#00F0FF'],f:'M50 172 L150 82 L204 112 L228 98 L336 172 Z',m:'M-10 200 V152 H30 V158 H60 V146 H88 V152 H120 V138 H150 V146 H178 V152 H210 V132 H240 V140 H268 V132 H298 V140 H330 V148 H422 V200 Z',d:'M124 144 h8 M154 152 h8 M214 138 h8 M244 146 h8 M272 138 h8 M20 162 q8 5 16 0 q8 5 16 0 M340 158 q8 5 16 0 q8 5 16 0'},
      '箱根':{s:[180,50,'#14B8A6'],f:'M20 180 L120 70 L200 100 L260 80 L360 180 Z',m:'M-10 200 V140 H40 V120 H80 V130 H120 V100 H160 V110 H200 V85 H240 V95 H280 V110 H320 V125 H360 V140 H422 V200 Z',d:'M140 110 h6 M200 92 h6 M60 132 q6 4 12 0 M280 118 q6 4 12 0'},
      '京都':{s:[300,62,'#FF2E88'],f:'M40 170 L100 80 L180 110 L240 90 L320 170 Z',m:'M-10 200 V130 H28 V78 H44 V130 H62 V118 H148 V114 H160 Q166 86 196 74 V60 H202 V48 H210 V60 H216 V74 Q246 86 252 114 H264 V118 H332 V134 H422 V200 Z',d:'M176 114 Q198 88 206 80 M236 114 Q214 88 206 80 M32 86 h8 M32 98 h8'},
      '奈良':{s:[120,55,'#14B8A6'],f:'M30 170 L90 80 L160 100 L220 85 L300 170 Z',m:'M-10 200 V130 H40 V100 H80 V120 H120 V105 H160 V115 H200 V125 H240 V110 H280 V120 H320 V135 H422 V200 Z',d:'M100 108 h6 M160 120 h6 M220 115 h6'},
      '大阪':{s:[206,58,'#FF2E88'],f:'M30 170 L100 85 L170 110 L230 90 L320 170 Z',m:'M-10 200 V142 H84 V122 H104 L112 96 L120 122 H134 L142 88 L150 122 H164 L174 64 L184 122 H196 L206 40 L216 122 H228 L238 64 L248 122 H262 L270 88 L278 122 H292 L300 96 L308 122 H328 V142 H422 V200 Z',d:'M206 40 V28 M200 33 H212 M174 64 V54 M238 64 V54'}
    };
  }

  function japanRt(){
    return {
      1:{s:[['北京',0],['成田',1],['新宿',2],['酒店',3]],m:['CA1831','N’EX','步5分']},
      2:{s:[['新宿',0],['浅草',2],['上野',4],['秋叶原',6],['新宿',8]],m:['银座线','步10分','日比谷线','中央线']},
      3:{s:[['新宿',0],['箱根汤谷',2],['强罗',4],['大涌谷',5],['桃源台',6],['箱根町',7],['旅馆',9]],m:['浪漫号','登山电车','缆车','海盗船','巴士']},
      4:{s:[['箱根',0],['小田原',1],['京都',4],['清水寺',6],['祇园',7]],m:['小田急','新干线','巴士205','步10分']},
      5:{s:[['京都',0],['伏见稻荷',1],['岚山',4],['天龙寺',6],['吉兆',8]],m:['JR奈良线','嵯峨野小火车','步15分','步10分']},
      6:{s:[['京都',0],['奈良',2],['大阪',5],['大阪城',6],['道顿堀',8]],m:['JR','JR','地铁','步10分']},
      7:{s:[['酒店',0],['黑门',1],['关西机场',3],['北京',5]],m:['步10分','HARUKA','CA927']}
    };
  }

  function japanGrad(){
    return {
      '东京':'linear-gradient(160deg,#0D0D1E 0%,#1A1436 45%,#3A1252 85%,#7A1E6E 115%)',
      '箱根':'linear-gradient(160deg,#06172B 0%,#0A2C4C 45%,#0E5A70 85%,#12A0A0 115%)',
      '京都':'linear-gradient(160deg,#140E2E 0%,#2A1650 50%,#6E1E4E 90%,#B0472E 122%)',
      '奈良':'linear-gradient(160deg,#0D0D1E 0%,#1A1436 45%,#0A3050 85%,#14B8A6 118%)',
      '大阪':'linear-gradient(160deg,#0D0D1E 0%,#1A1436 45%,#3A1252 85%,#7A1E6E 115%)'
    };
  }

  function japanPre(){
    return [
      '2.1 抢清水寺门票 · 2.17 场',
      '岚山嵯峨野小火车指定席 · 2.18 右侧座位',
      '小田急浪漫号指定席 · 2.16 往返',
      '新干线 Nozomi · 2.17 箱根→京都',
      '关西机场→北京 CA927 · 2.20',
      '箱根温泉旅馆一泊二食预约确认',
      '祇园京都料理晚餐预约 · 2.17 19:00',
      '岚山吉兆晚餐预约 · 2.18 19:00 · ⚠ 提前 1 个月'
    ];
  }

  function japanBook(){
    return [
      '岚山吉兆 · 2.18 晚 19:00 · ⚠ 必须提前 1 个月',
      '祇园京都料理 · 2.17 晚 19:00 · 町屋怀石',
      'Shinjuku Granbell Hotel · 2.14-16',
      '箱根绿之风 Ryokan · 2.16 · 一泊二食',
      'Kyoto Travellers Inn · 2.17-18',
      'Cross Hotel Osaka · 2.19-20'
    ];
  }

  function japanEmg(){
    return [
      {label:'警察',num:'110'},
      {label:'急救/消防',num:'119'},
      {label:'海上事故',num:'118'},
      {label:'旅游热线（英文）',num:'050 3816 2787'}
    ];
  }

  function japanCons(){
    return [
      {label:'中国驻日本使馆领保',num:'+81 3 3403 3065'},
      {label:'外交部全球领保热线（24h）',num:'+86 10 12308'}
    ];
  }

  /* ===== ICELAND TRIP DATA (5 days, 2027 Summer) ===== */
  function icelandTrip(){
    var N=function(t,title,sub,x){return Object.assign({t:t,title:title,sub:sub||''},x||{});};
    var days=[
      {date:'7.15',wk:'四',city:'雷克雅未克',sum:'北京飞雷克雅未克 · 黄金圈',route:'北京 → 凯夫拉维克机场 → 雷克雅未克',
       stay:{name:'Reykjavik Residence Hotel',addr:'Thverholt 7-9, 101 Reykjavik',tel:'+354 511 1313'},
       dinner:{name:'Dill Restaurant · 19:30',info:'冰岛新北欧料理 · 米其林一星 · 需预约'},
       daily:['租车取车确认 · 预订全险','GPS 离线地图下载','ISIC 国际学生证如有','Dill 餐厅预约确认'],
       nodes:[
        N('13:30','CA907 北京起飞','约 10 小时直飞',{tag:'✈',wc:'有',rating:'—',tip:'10小时直飞·准备颈枕眼罩'}),
        N('17:00','降落凯夫拉维克机场','时差 -8h · 入境+取行李',{wc:'站内',rating:'—',tip:'还车+值机'}),
        N('18:00','取租车 · 机场出发','预约全险 + GPS',{tag:'🚗',note:'右舵左行 · 注意环岛规则',wc:'有',rating:'—',tip:'预约全险+GPS·右舵左行·注意环岛规则'}),
        N('19:00','到雷克雅未克 · 入住','机场 50km 约 45 分钟',{addr:'Reykjavik Residence Hotel, Thverholt 7-9',tel:'+354 511 1313',wc:'有',rating:'4.5',tip:'机场50km约45分钟'}),
        N('19:30','Dill 晚餐','米其林一星 · 烟熏羊肉/北极鳕',{note:'⚠ 必须提前预约 · 人均 15000 ISK',wc:'有',rating:'5.0',tip:'米其林一星·烟熏羊肉/北极鳕·必须提前预约'}),
        N('22:00','午夜日落散步','7 月极昼 · 太阳不落 · 海边',{wc:'有',rating:'5.0',tip:'7月极昼·太阳不落·海边'})]
      },
      {date:'7.16',wk:'五',city:'南岸',sum:'黄金圈+南岸瀑布',route:'雷克雅未克 → 辛格维利尔 → 盖锡尔 → 黄金瀑布 → 南岸',
       stay:{name:'Hotel Skogafoss',addr:'Skogar 861, Iceland',tel:'+354 487 8780'},
       dinner:{name:'Hotel Skogafoss 晚餐 · 19:00',info:'含住宿 · 羊肉汤+黑麦面包'},
       daily:['加油 · 满油出发','辛格维利尔国家公园门票','盖锡尔间歇泉每 7 分钟喷','黄金瀑布走两个观景台'],
       nodes:[
        N('08:00','出发 · 黄金圈','雷克雅未克东行 60km',{wc:'无（沿途）',rating:'—',tip:'雷克雅未克东行60km'}),
        N('09:00','辛格维利尔国家公园','北美/欧亚板块裂缝 · 世界遗产',{addr:'Thingvellir National Park',note:'免费 · 停车 500 ISK',wc:'有',rating:'4.0',tip:''}),
        N('10:30','盖锡尔间歇泉','Strokkur 每 7 分钟喷一次',{addr:'Geysir, Haukadalur',wc:'有',rating:'4.5',tip:'Strokkur每7分钟喷一次'}),
        N('11:15','黄金瀑布','双层瀑布 · 32 米落差',{addr:'Gullfoss Waterfall',note:'水雾大带防水',wc:'有',rating:'5.0',tip:'双层瀑布·32米落差·水雾大带防水'}),
        N('12:30','黄金圈午餐','游客中心三明治/羊肉汤',{wc:'有',rating:'3.5',tip:'游客中心三明治/羊肉汤'}),
        N('13:30','南下 1 号环岛公路','向东行驶 120km',{wc:'无（沿途）',rating:'—',tip:'向东行驶120km'}),
        N('15:00','塞里雅兰瀑布','可以走到瀑布后面',{addr:'Seljalandsfoss',note:'穿防水衣',wc:'无',rating:'4.5',tip:'可以走到瀑布后面·穿防水衣'}),
        N('16:00','斯科加瀑布','60 米高 · 爬 527 级台阶到顶',{addr:'Skogafoss',note:'彩虹常现',wc:'无',rating:'5.0',tip:'60米高·爬527级台阶到顶·彩虹常现'}),
        N('17:00','酒店入住','瀑布旁步行 5 分钟',{addr:'Hotel Skogafoss, Skogar 861',tel:'+354 487 8780',wc:'有',rating:'4.0',tip:'瀑布旁步行5分钟'}),
        N('19:00','酒店晚餐','冰岛羊肉汤 + 黑麦面包',{wc:'有',rating:'4.0',tip:'冰岛羊肉汤+黑麦面包'}),
        N('21:00','瀑布夜景','极昼不黑 · 拍长曝光',{wc:'有',rating:'4.0',tip:''})]
      },
      {date:'7.17',wk:'六',city:'冰河湖',sum:'黑沙滩+冰河湖+钻石海滩',route:'斯科加 → 维克 → 杰古沙龙冰河湖',
       stay:{name:'Hali Country Hotel',addr:'Hali 785, Iceland',tel:'+354 478 9070'},
       dinner:{name:'Hali 龙虾汤 · 19:00',info:'冰岛龙虾汤名店 · 人均 6000 ISK'},
       daily:['黑沙滩注意大浪（致命！）','冰河湖游船预约确认','钻石海滩拍冰块','加油 · 下一个站在杰古沙龙'],
       nodes:[
        N('08:00','出发 · 维克镇','1 号公路东行 30km',{wc:'无（沿途）',rating:'—',tip:'1号公路东行30km'}),
        N('08:30','黑沙滩 Reynisfjara','玄武岩柱+黑沙 · ⚠ 腥浪致命',{addr:'Reynisfjara, Vik',note:'⚠ 永远不要背对大海 · 大浪突然来袭',wc:'无',rating:'5.0',tip:'永远不要背对大海·大浪突然来袭'}),
        N('10:00','迪霍拉利海岬','拱门石桥 · 海鸟栖息地',{wc:'无',rating:'4.5',tip:'拱门石桥·海鸟栖息地'}),
        N('11:30','维克镇午餐','冰岛热狗 + 龙虾汤',{wc:'有',rating:'4.0',tip:'冰岛热狗+龙虾汤'}),
        N('12:30','东行 1 号公路','190km 到冰河湖',{wc:'无（沿途）',rating:'—',tip:'190km到冰河湖'}),
        N('15:00','杰古沙龙冰河湖','蓝色冰山漂浮 · 冰岛标志',{addr:'Jokulsarlon Glacier Lagoon',note:'游船需预约 · 约 9000 ISK',wc:'无',rating:'5.0',tip:'蓝色冰山漂浮·冰岛标志·游船需预约'}),
        N('16:30','钻石海滩','冰河湖对岸 · 冰块冲上黑沙',{wc:'无',rating:'5.0',tip:'冰河湖对岸·冰块冲上黑沙'}),
        N('17:30','酒店入住','冰河湖东 20km',{addr:'Hali Country Hotel, Hali 785',tel:'+354 478 9070',wc:'无',rating:'5.0',tip:'蓝色冰山漂浮·冰岛标志·游船需预约'}),
        N('19:00','Hali 龙虾汤晚餐','冰岛名菜 · 鲜捕龙虾',{wc:'有',rating:'4.5',tip:'冰岛名菜·鲜捕龙虾'}),
        N('21:30','冰河湖极昼夜景','午夜阳光下的冰山',{wc:'无',rating:'5.0',tip:'蓝色冰山漂浮·冰岛标志·游船需预约'})]
      },
      {date:'7.18',wk:'日',city:'北部',sum:'东部峡湾→米湖→众神瀑布',route:'杰古沙龙 → 东部峡湾 → 米湖 → 阿克雷里',
       stay:{name:'Hotel Kea Akureyri',addr:'Geislagata 7, 600 Akureyri',tel:'+354 460 2000'},
       dinner:{name:'Rub 23 · 19:30',info:'阿克雷里寿司/创意料理 · 人均 7000 ISK'},
       daily:['东部峡湾弯道多慢开','米湖温泉带泳衣','众神瀑布拍长曝光','到阿克雷里加油'],
       nodes:[
        N('08:00','出发 · 东部峡湾','1 号公路北行 · 蜿蜒海岸线',{wc:'无（沿途）',rating:'—',tip:'1号公路北行'}),
        N('10:00','都皮沃古尔小镇','峡湾渔村 · 鸡蛋雕塑',{wc:'有',rating:'4.0',tip:''}),
        N('11:00','埃伊尔斯塔济加油','东部最大镇 · 最后加油站',{note:'之后到米湖 200km 无加油站',wc:'站内',rating:'—',tip:''}),
        N('12:30','1 号公路北段','荒原+雪山 · 注意横风',{wc:'站内',rating:'—',tip:''}),
        N('14:00','米湖温泉','天然地热温泉 · 类似蓝湖但人少',{tag:'♨',addr:'Jarðbðin við Mývatn',note:'门票约 5000 ISK · 带泳衣',wc:'有',rating:'4.5',tip:'天然地热温泉·类似蓝湖但人少·门票5000ISK·带泳衣'}),
        N('15:30','米湖地热区','硫磺喷气+泥浆池 · 月球地貌',{wc:'无',rating:'4.5',tip:'硫磺喷气+泥浆池·月球地貌'}),
        N('16:30','众神瀑布 Goðafoss','弧形瀑布 · 冰岛最美之一',{addr:'Godafoss, Iceland',wc:'无',rating:'5.0',tip:'弧形瀑布·冰岛最美之一'}),
        N('17:30','到阿克雷里 · 入住','冰岛第二大城市',{addr:'Hotel Kea, Geislagata 7, Akureyri',tel:'+354 460 2000',wc:'有',rating:'4.0',tip:'冰岛第二大城市'}),
        N('19:30','Rub 23 晚餐','北极鳕/鲸肉/创意寿司',{note:'需预约',wc:'有',rating:'4.5',tip:'北极鳕/鲸肉/创意寿司·需预约'}),
        N('22:00','阿克雷里午夜阳光','北极圈下 · 太阳不落',{wc:'有',rating:'5.0',tip:'北极圈下·太阳不落'})]
      },
      {date:'7.19',wk:'一',city:'斯奈山',sum:'阿克雷里→斯奈山→雷克雅未克',route:'阿克雷里 → 斯奈山半岛 → 雷克雅未克 → 机场',
       stay:null,dinner:null,
       daily:['退房 8:00','斯奈山教会山拍照','Búðir 黑教堂','机场还车前加满油'],
       nodes:[
        N('08:00','退房 · 1 号公路西行','沿北海岸 300km',{wc:'站内',rating:'—',tip:''}),
        N('10:30','斯奈山半岛入口','转向 54 号公路',{wc:'无（沿途）',rating:'—',tip:'转向54号公路'}),
        N('11:00','教会山 Kirkjufell','草帽山 · 冰岛被拍最多的山',{addr:'Kirkjufell, Grundarfjordur',note:'机位在瀑布对面',wc:'无',rating:'5.0',tip:'草帽山·冰岛被拍最多的山·机位在瀑布对面'}),
        N('12:00','Búðir 黑教堂','黑色木教堂 · 荒原背景',{addr:'Budakirkja, Snaefellsnes',wc:'无',rating:'4.5',tip:'黑色木教堂·荒原背景'}),
        N('13:00','斯奈山午餐','Arnarstapi 渔村 · 龙虾汤',{wc:'有',rating:'4.0',tip:'Arnarstapi渔村·龙虾汤'}),
        N('14:00','海蚀拱门 Gatklettur','圆石海滩+玄武岩拱',{wc:'无',rating:'4.5',tip:'圆石海滩+玄武岩拱'}),
        N('16:00','返回 1 号公路','西行回雷克雅未克 180km',{wc:'无（沿途）',rating:'—',tip:'西行回雷克雅未克180km'}),
        N('18:00','雷克雅未克加油还车','机场方向 · 加满油',{tag:'🚗',note:'还车必须满油 · 否则罚款 8000 ISK',wc:'加油站',rating:'—',tip:'还车必须满油·否则罚款8000ISK'}),
        N('19:00','凯夫拉维克机场','还车+值机',{tag:'✈',addr:'Keflavik International Airport',wc:'站内',rating:'—',tip:'还车+值机'}),
        N('21:00','CA908 起飞','约 10 小时到北京',{wc:'有',rating:'—',tip:'10小时到北京'})]
      }
    ];
    days.forEach(function(d,i){d.n=i+1;d.nodes.forEach(function(nd){if(nd.sm==null){var m=nd.t.match(/(\d{1,2}):(\d{2})/);nd.sm=m?(+m[1])*60+(+m[2]):0;}});});
    return days;
  }

  function icelandArt(){
    return {
      '雷克雅未克':{s:[200,55,'#00F0FF'],f:'M30 170 L100 80 L180 100 L240 85 L320 170 Z',m:'M-10 200 V130 H40 V100 H80 V120 H120 V105 H160 V115 H200 V125 H240 V110 H280 V120 H320 V135 H422 V200 Z',d:'M100 108 h6 M160 120 h6 M220 115 h6'},
      '南岸':{s:[120,60,'#14B8A6'],f:'M20 180 L120 70 L200 100 L260 80 L360 180 Z',m:'M-10 200 V140 H40 V120 H80 V130 H120 V100 H160 V110 H200 V85 H240 V95 H280 V110 H320 V125 H360 V140 H422 V200 Z',d:'M140 110 h6 M200 92 h6 M60 132 q6 4 12 0 M280 118 q6 4 12 0'},
      '冰河湖':{s:[330,50,'#00F0FF'],f:'M40 170 L100 80 L180 100 L240 90 L320 170 Z',m:'M-10 200 V140 H40 V90 H80 V140 H120 V75 H160 V140 H200 V90 H240 V140 H280 V80 H320 V140 H360 V130 H422 V200 Z',d:'M80 92 h6 M160 80 h6 M240 92 h6 M320 80 h6'},
      '北部':{s:[74,56,'#14B8A6'],f:'M50 172 L150 82 L204 112 L228 98 L336 172 Z',m:'M-10 200 V150 H36 V142 H72 V150 H94 V72 L103 54 L112 72 V150 H132 Q147 118 162 150 H176 Q191 118 206 150 H422 V200 Z',d:'M262 158 Q290 168 318 158 M180 164 q9 5 18 0 q9 5 18 0'},
      '斯奈山':{s:[206,58,'#FF2E88'],f:'M30 170 L100 85 L170 110 L230 90 L320 170 Z',m:'M-10 200 V142 H84 V122 H104 L112 96 L120 122 H134 L142 88 L150 122 H164 L174 64 L184 122 H196 L206 40 L216 122 H228 L238 64 L248 122 H262 L270 88 L278 122 H292 L300 96 L308 122 H328 V142 H422 V200 Z',d:'M206 40 V28 M200 33 H212 M174 64 V54 M238 64 V54'}
    };
  }

  function icelandRt(){
    return {
      1:{s:[['北京',0],['凯夫拉维克',1],['雷克雅未克',2],['酒店',3]],m:['CA907','租车','驾车45分']},
      2:{s:[['酒店',0],['辛格维利尔',2],['盖锡尔',4],['黄金瀑布',5],['塞里雅兰',7],['斯科加',8],['酒店',9]],m:['驾车60km','驾车30km','驾车30km','驾车120km','驾车30km']},
      3:{s:[['酒店',0],['黑沙滩',2],['迪霍拉利',3],['维克',4],['冰河湖',7],['钻石海滩',8],['酒店',9]],m:['驾车30km','驾车15km','驾车10km','驾车190km','驾车20km','驾车20km']},
      4:{s:[['酒店',0],['东部峡湾',2],['都皮沃古尔',3],['埃伊尔斯塔济',4],['米湖',7],['众神瀑布',8],['阿克雷里',9]],m:['驾车80km','驾车60km','驾车200km','驾车40km','驾车30km']},
      5:{s:[['酒店',0],['教会山',3],['黑教堂',4],['海蚀拱门',6],['雷克雅未克',8],['机场',9]],m:['驾车200km','驾车40km','驾车30km','驾车180km','驾车50km']}
    };
  }

  function icelandGrad(){
    return {
      '雷克雅未克':'linear-gradient(160deg,#051A2E 0%,#0A3050 45%,#0F6E86 85%,#14B8A6 118%)',
      '南岸':'linear-gradient(160deg,#06172B 0%,#0A2C4C 45%,#0E5A70 85%,#12A0A0 115%)',
      '冰河湖':'linear-gradient(160deg,#050D28 0%,#0B1C48 45%,#153A7A 80%,#2E6EB0 115%)',
      '北部':'linear-gradient(160deg,#051A2E 0%,#0A3050 45%,#0F6E86 85%,#14B8A6 118%)',
      '斯奈山':'linear-gradient(160deg,#0D0D1E 0%,#1A1436 45%,#3A1252 85%,#7A1E6E 115%)'
    };
  }

  function icelandPre(){
    return [
      '租车预订 · 全险 + GPS + 沙石路险',
      'Dill 餐厅预约 · 7.15 晚 19:30 · 米其林一星',
      '冰河湖游船预约 · 7.17 15:00',
      'Rub 23 预约 · 7.18 晚 19:30',
      '离线地图下载 · 1 号公路信号弱',
      '防水衣裤 + 泳衣 + 徒步鞋',
      '确认 CA907/CA908 航班'
    ];
  }

  function icelandBook(){
    return [
      'Dill Restaurant · 7.15 晚 19:30 · ⚠ 必须提前 1 个月',
      '冰河湖游船 · 7.17 15:00 · 约 9000 ISK',
      'Rub 23 · 7.18 晚 19:30',
      'Reykjavik Residence Hotel · 7.15',
      'Hotel Skogafoss · 7.16 · 含晚餐',
      'Hali Country Hotel · 7.17 · 含龙虾汤',
      'Hotel Kea Akureyri · 7.18'
    ];
  }

  function icelandEmg(){
    return [
      {label:'冰岛通用紧急（警察/急救/消防）',num:'112'},
      {label:'海上救援',num:'+354 511 3333'},
      {label:'游客信息热线',num:'+354 528 5050'}
    ];
  }

  function icelandCons(){
    return [
      {label:'中国驻冰岛使馆领保',num:'+354 552 6891'},
      {label:'外交部全球领保热线（24h）',num:'+86 10 12308'}
    ];
  }

  /* ===== TRIP DATA LOOKUP ===== */
  var TRIP_DATA={
    italy2026:{Y:2026,LSK:'zouzhe_italy_2026_v1',country:'意大利',titleSub:'罗马 → 索伦托 → 佛罗伦萨 → 威尼斯 → 米兰',overviewSub:'圣彼得 / 斗兽场 / 庞贝 / 乌菲兹 / 圣马可 / 大教堂'},
    japan2027:{Y:2027,LSK:'zouzhe_japan_2027_v1',country:'日本',titleSub:'东京 → 箱根 → 京都 → 奈良 → 大阪',overviewSub:'浅草寺 / 伏见稻荷 / 清水寺 / 岚山 / 东大寺 / 道顿堀',tripFn:japanTrip,artFn:japanArt,rtFn:japanRt,gradFn:japanGrad,preFn:japanPre,bookFn:japanBook,emgFn:japanEmg,consFn:japanCons},
    iceland2027:{Y:2027,LSK:'zouzhe_iceland_2027_v1',country:'冰岛',titleSub:'雷克雅未克 → 南岸 → 冰河湖 → 北部 → 斯奈山',overviewSub:'黄金圈 / 黑沙滩 / 冰河湖 / 米湖 / 众神瀑布 / 教会山',tripFn:icelandTrip,artFn:icelandArt,rtFn:icelandRt,gradFn:icelandGrad,preFn:icelandPre,bookFn:icelandBook,emgFn:icelandEmg,consFn:icelandCons}
  };

  /* ===== COMPONENT PROTOTYPE OVERRIDE ===== */
  var compProto=null;
  var origMethods={};
  var compInst=null;

  function overrideComponent(){
    // The DC runtime stores the compiled Component class in registry entries.
    // window.__dcRootName() returns "Root" (default) but the actual entry is
    // stored under dcNameFromPath(pathname) which is "index" for /index.html.
    // So we iterate the registry to find the entry with a non-null Logic.
    var registry=window.__dcRegistry;
    if(!registry) return false;
    var entry=null;
    for(var rname in registry){
      try{
        var re=registry[rname];
        if(re&&re.Logic&&re.Logic.prototype){
          entry=re;
          break;
        }
      }catch(e){}
    }
    if(!entry) return false;
    compProto=entry.Logic.prototype;
    console.log('[ZZ] overrideComponent: found Component prototype');

    // Save originals
    origMethods.trip=compProto.trip;
    origMethods.artFor=compProto.artFor;
    origMethods.rtOf=compProto.rtOf;
    origMethods.gradOf=compProto.gradOf;
    origMethods.preRaw=compProto.preRaw;
    origMethods.bookRaw=compProto.bookRaw;
    origMethods.emgRaw=compProto.emgRaw;
    origMethods.consRaw=compProto.consRaw;
    origMethods.nowInfo=compProto.nowInfo;
    origMethods.renderVals=compProto.renderVals;
    origMethods.setP=compProto.setP;
    origMethods.componentDidMount=compProto.componentDidMount;
    origMethods.pickDay=compProto.pickDay;

    // Override trip() - returns different data based on __zzTripId
      /* ===== ITALY NODE ENRICHMENT (wc/rating/tip) ===== */
  var ITALY_ENRICH={
    'CA939':{wc:'\u6709',rating:'\u2014',tip:'\u63d0\u524d3\u5c0f\u65f6\u5230T3\u822a\u7ad9\u697c'},
    'CA950':{wc:'\u6709',rating:'\u2014',tip:'\u9000\u7a0e\u968f\u8eab\u00b7\u514d\u7a0e\u67dc\u53f0\u5148\u76d6\u7ae0'},
    'Malpensa':{wc:'\u7ad9\u5185',rating:'\u2014',tip:'Malpensa Express\u7ea650\u5206\u949f\u5230T1'},
    '降落罗马':{wc:'\u7ad9\u5185',rating:'\u2014',tip:'\u5165\u5883+\u53d6\u884c\u674e\u7ea61\u5c0f\u65f6'},
    '机场快线':{wc:'\u7ad9\u5185',rating:'\u2014',tip:'\u8ddf\u706b\u8f66Treni\u6307\u793a\u5230T3\u706b\u8f66\u7ad9\u00b7\u7ea632\u5206\u949f'},
    '酒店入住':{wc:'\u6709',rating:'4.0',tip:'\u9a6c\u5c14\u8428\u62c9\u8857\u51fa\u53e3\u51fa\u7ad9\u6b65\u884c3\u5206\u949f'},
    '简单晚餐':{wc:'\u6709',rating:'3.5',tip:'\u65c5\u884c\u9996\u65e5\u7b80\u5355\u5403\u00b7\u65e9\u7761\u8c03\u65f6\u5dee'},
    '地铁 A 线':{wc:'\u7ad9\u5185',rating:'\u2014',tip:'\u5965\u5854\u7ef4\u4e9a\u8bfa\u7ad9\u4e0b\u8f66'},
    '安检排队':{wc:'\u6709',rating:'4.5',tip:'\u65e9\u6668\u6392\u961f\u4eba\u5c11\u00b7\u5982\u672a\u9884\u7ea6\u73b0\u573a\u6392\u961f'},
    '圣彼得大教堂':{wc:'\u6709',rating:'5.0',tip:'\u7535\u68af+320\u7ea7\u53f0\u9636\u00b7\u5165\u53e3\u5728\u6559\u5802\u53f3\u4fa7'},
    'Bonci':{wc:'\u6709',rating:'4.5',tip:'\u6309\u91cd\u8ba1\u4ef7\u00b7\u63a8\u8350\u571f\u8c46\u9999\u80a0/\u70b8\u8304\u5b50\u7f57\u52d2'},
    '梵蒂冈博物馆':{wc:'\u6709',rating:'5.0',tip:'\u95e8\u7968\u4e8c\u7ef4\u7801\u63d0\u524d\u622a\u56fe'},
    '圣天使堡':{wc:'\u6709',rating:'4.0',tip:'\u53ea\u770b\u5916\u89c2\u00b7\u9ec4\u660f\u673a\u4f4d'},
    '圣天使桥':{wc:'\u65e0',rating:'4.5',tip:'\u9ec4\u660f\u673a\u4f4d\u00b7\u62cd\u5723\u5929\u4f7f\u50cf'},
    'RIONE XIV':{wc:'\u6709',rating:'4.5',tip:'\u5bb6\u5ead\u7f57\u9a6c\u83dc\u00b7\u624b\u5de5\u610f\u9762/\u5343\u5c42\u9762\u00b7\u8ba2\u4f4d19:00\u9996\u8f6e'},
    '回特米尼':{wc:'\u7ad9\u5185',rating:'\u2014',tip:'\u5730\u94c1A\u7ebf\u56de\u7279\u7c73\u5c3c'},
    '40/64 路':{wc:'\u6709',rating:'\u2014',tip:'\u516c\u4ea4\u8f66\u5230\u963f\u6839\u5ef7\u5e7f\u573a'},
    '圣依纳爵堂':{wc:'\u6709',rating:'4.5',tip:'\u514d\u8d39\u00b7\u955c\u5b50\u62cd\u5929\u9876'},
    '万神殿':{wc:'\u6709',rating:'5.0',tip:'10\u201312\u70b9\u5149\u67f1\u89d2\u5ea6\u6700\u4f4e\u6700\u51fa\u7247'},
    '纳沃纳广场':{wc:'\u65e0',rating:'4.5',tip:'\u56db\u6cb3\u55b7\u6cc9\u00b7\u514d\u8d39\u00b7\u591c\u666f\u7f8e'},
    'Supplizio':{wc:'\u6709',rating:'4.0',tip:'\u7cbe\u54c1suppl\u00ec\u00b7\u4e701\u20132\u4e2a\u5206\u98df\u57ab\u809a\u5b50'},
    'Come':{wc:'\u6709',rating:'4.5',tip:'\u624b\u5de5\u610f\u9762\u00b7\u70b9\u5361\u90a6\u5c3c/\u963f\u9a6c\u7279\u91cc\u6076\u7eb3'},
    'Giolitti':{wc:'\u6709',rating:'4.5',tip:'1900\u5e74\u8001\u5e97\u00b7\u5148\u6536\u94f6\u53f0\u4ed8\u6b3e\u518d\u51ed\u5c0f\u7968\u9009\u53e3\u5473'},
    '西班牙台阶':{wc:'\u65e0',rating:'4.0',tip:'\u4e0b\u5348\u987a\u5149\u00b7\u65c1\u8fb9\u8d2d\u7269\u8857'},
    '博尔盖塞':{wc:'\u6709',rating:'5.0',tip:'\u4e25\u683c2\u5c0f\u65f6\u6e05\u573a\u00b714:35\u5230\u9986\u5bc4\u5305'},
    '平丘观景台':{wc:'\u65e0',rating:'5.0',tip:'\u65e5\u843d18:55\u00b7\u4f50\u5224\u5224\u679c\u5e7f\u573a\u5168\u666f'},
    'Settimio':{wc:'\u6709',rating:'4.5',tip:'\u8001\u6d3e\u7f57\u9a6c\u5bb6\u5e38\u83dc\u00b7\u725b\u8089\u4e38/\u71c2\u83dc/\u67e0\u6aac\u6241\u4ec1\u7cd4'},
    '特莱维喷泉':{wc:'\u65e0',rating:'5.0',tip:'\u591c\u666f\u706f\u5149\u7f8e\u00b7\u6295\u5e01\u8bb8\u613f'},
    'Trapizzino':{wc:'\u6709',rating:'4.0',tip:'\u62bd\u5c44\u5f0f\u4e09\u89d2\u9970\u00b7\u7f57\u9a6c\u98ce\u5473'},
    '马西莫竞技场':{wc:'\u6709',rating:'4.0',tip:'\u514d\u8d39\u00b7\u53e4\u7f57\u9a6c\u9057\u5740'},
    '真理之口':{wc:'\u65e0',rating:'4.0',tip:'\u51fa\u7ad9\u6b65\u884c5\u5206\u949f\u00b7\u5468\u65e5\u4eba\u591a'},
    '维托里亚诺':{wc:'\u6709',rating:'4.5',tip:'\u514d\u8d39\u5e73\u53f0\u00b7\u4fef\u77b0\u53e4\u7f57\u9a6c\u5e7f\u573a'},
    '图拉真广场':{wc:'\u65e0',rating:'4.0',tip:'\u6cbf\u8857\u4fef\u77b0\u00b7\u514d\u8d39'},
    '古罗马广场':{wc:'\u6709',rating:'5.0',tip:'\u5c71\u9876\u4fef\u77b0\u662f\u673a\u4f4d\u00b7\u4e70\u7968\u542b\u6597\u517d\u573a'},
    '斗兽场':{wc:'\u6709',rating:'5.0',tip:'16:00\u65f6\u6bb5\u00b7\u5730\u4e0b\u7248\u4f18\u5148\u00b7\u79d2\u6ca1\u8f6c\u7ade\u6280\u573a\u7248'},
    '场外日落':{wc:'\u65e0',rating:'5.0',tip:'\u65e5\u843d\u5168\u666f\u673a\u4f4d\u00b7\u514d\u8d39'},
    'Da Felice':{wc:'\u6709',rating:'5.0',tip:'\u684c\u8fb9\u73b0\u62bcccacio e pepe\u00b7\u9700\u6570\u5468\u524d\u9884\u7ea6'},
    '退房':{wc:'\u7ad9\u5185',rating:'\u2014',tip:'\u63a8\u7bb1\u8fdb\u7279\u7c73\u5c3c\u00b7\u5927\u4ef6\u653e\u8f66\u5934\u5c3e\u884c\u67b6'},
    '红箭 9503':{wc:'\u7ad9\u5185',rating:'\u2014',tip:'Trenitalia\u00b7\u63d0\u524d20\u5206\u949f\u5230\u7ad9\u53f0'},
    '那不勒斯':{wc:'\u7ad9\u5185',rating:'\u2014',tip:'\u5b58\u884c\u674e\u00b7\u80cc\u5305\u968f\u8eab'},
    '环维苏威线':{wc:'\u7ad9\u5185',rating:'\u2014',tip:'Circumvesuviana\u00b7\u5e95\u5c42\u4e58\u8f66'},
    '庞贝':{wc:'\u6709',rating:'5.0',tip:'\u6d77\u95e8\u8fdb\u56ed\u00b74\u5c0f\u65f6\u7cbe\u534e\u00b7\u5e26\u5e72\u7cae\u6c34\u5e3d\u9632\u6652'},
    '小火车':{wc:'\u7ad9\u5185',rating:'\u2014',tip:'\u8fd4\u7a0b\u00b7\u5e95\u5c42\u4e58\u8f66'},
    '加里波第':{wc:'\u7ad9\u5185',rating:'\u2014',tip:'\u53d6\u7bb1\u00b7\u51fa\u793a\u5355\u636e'},
    '坎帕尼亚快线':{wc:'\u7ad9\u5185',rating:'\u2014',tip:'Campania Express\u00b7\u5730\u4e0b\u5c42\u4e58\u8f66'},
    '索伦托':{wc:'\u6709',rating:'4.5',tip:'\u5854\u7d22\u5e7f\u573a\u8fdb\u5723\u5207\u8428\u96f7\u5965\u6b65\u884c\u8857'},
    'Parrucchiano':{wc:'\u6709',rating:'5.0',tip:'150\u5e74\u67e0\u6aac\u56ed\u82b1\u623f\u8001\u5e97\u00b7\u5fc5\u70b9cannelloni'},
    '渡轮':{wc:'\u6709',rating:'\u2014',tip:'\u6700\u65e9\u73ed\u00b7\u5148\u4e70\u56de\u7a0b\u7968'},
    '蓝洞':{wc:'\u65e0',rating:'4.5',tip:'\u6d77\u51b5\u5dee\u5219\u5173\u95ed\u00b7\u672c\u65e5\u4e0e9.30\u5bf9\u8c03'},
    '索拉罗山':{wc:'\u65e0',rating:'4.5',tip:'\u7f06\u6905\u767b\u9876\u00b7\u5168\u5c9b\u4fef\u77b0'},
    'Da Paolino':{wc:'\u6709',rating:'4.5',tip:'\u67e0\u6aac\u6811\u7a79\u9876\u540d\u5e97\u00b7\u9884\u7ea6booking@paolinocapri.com'},
    '缆车':{wc:'\u7ad9\u5185',rating:'\u2014',tip:'\u4e0a\u5361\u666e\u91cc\u9547'},
    '奥古斯都花园':{wc:'\u65e0',rating:'5.0',tip:'\u6cd5\u62c9\u5ed6\u5c3c\u4e09\u5de8\u5ca9+\u514b\u8231\u6d6e\u4e4b\u5b57\u5c0f\u9053\u673a\u4f4d'},
    'Inn Bufalito':{wc:'\u6709',rating:'4.0',tip:'\u8f7b\u98df\u5411\u00b7\u65e0\u9700\u8ba2\u4f4d\u968f\u5230\u968f\u5403'},
    '公交':{wc:'\u6709',rating:'\u2014',tip:'\u5230\u7d22\u4f26\u6258\u89d2'},
    '乔万娜王后浴场':{wc:'\u65e0',rating:'4.5',tip:'\u65e0\u6551\u751f\u5458\u00b7\u6e05\u770b\u843d\u70b9\u6c34\u6df1\u00b7\u6d6a\u5927\u53ea\u6e38\u4e0d\u8df3'},
    'La Cantinaccia':{wc:'\u6709',rating:'4.0',tip:'\u73b0\u5207\u706b\u817f+\u5e73\u5e95\u9505\u756a\u8304\u610f\u9762\u00b7\u4e0d\u63a5\u53d7\u8ba2\u4f4d'},
    'Da Emilia':{wc:'\u6709',rating:'4.5',tip:'\u684c\u5b50\u5728\u6c34\u8fb9\u00b7\u8ba2\u6c34\u8fb9\u4f4d'},
    '沿岸散步':{wc:'\u65e0',rating:'4.0',tip:'\u6d77\u8fb9\u6563\u6b65\u00b7\u65e5\u843d'},
    '环维苏威线普通车':{wc:'\u7ad9\u5185',rating:'\u2014',tip:'\u666e\u901a\u8f66\u00b7\u6162\u4e8e\u5feb\u8f66'},
    '步行 12 分钟':{wc:'\u65e0',rating:'\u2014',tip:'\u6b65\u884c\u5230Da Michele'},
    'Da Michele':{wc:'\u6709',rating:'4.5',tip:'\u767e\u5e74\u62ab\u8428\u540d\u5e97\u00b7\u4ec5\u4e24\u79cd\u62ab\u8428\u00b7\u6392\u961f'},
    'Attanasio':{wc:'\u6709',rating:'4.5',tip:'\u8d1d\u58f3\u9165\u540d\u5e97\u00b7\u73b0\u573a\u73b0\u70d8'},
    'Italo 9940':{wc:'\u7ad9\u5185',rating:'\u2014',tip:'\u9ad8\u94c1\u00b7\u5230\u4f5b\u7f57\u4f26\u8428'},
    '佛罗伦萨':{wc:'\u7ad9\u5185',rating:'\u2014',tip:'\u65b0\u5723\u6bcd\u7ad9\u4e0b\u8f66'},
    '圣十字广场':{wc:'\u65e0',rating:'4.5',tip:'\u514d\u8d39\u00b7\u8001\u6865\u65b9\u5411\u8d70'},
    '老桥':{wc:'\u65e0',rating:'4.5',tip:'\u91d1\u5e93\u73e0\u5b9d\u5e97\u00b7\u65e5\u843d\u673a\u4f4d'},
    'Buca dell':{wc:'\u6709',rating:'4.5',tip:'\u8001\u6865\u6865\u5934\u5730\u7a91\u5e97\u00b7\u9700\u7535\u8bdd\u786e\u8ba4'},
    '学院美术馆':{wc:'\u6709',rating:'5.0',tip:'\u5927\u536b\u00b7\u9884\u7ea6\u5fc5\u8981\u00b7\u4e25\u683c\u6e05\u573a'},
    'Trattoria Mario':{wc:'\u6709',rating:'4.5',tip:'\u624b\u5de5\u610f\u9762\u00b7\u4e0d\u63a5\u53d7\u9884\u7ea6\u00b7\u5f00\u95e8\u5373\u5230'},
    '乌菲兹美术馆':{wc:'\u6709',rating:'5.0',tip:'\u9884\u7ea6\u5fc5\u8981\u00b7\u65e9\u6668\u4eba\u5c11'},
    'All\u2019Antico Vinaio':{wc:'\u6709',rating:'4.5',tip:'\u5939\u9985\u540d\u5e97\u00b7\u6392\u961f'},
    '米开朗基罗广场':{wc:'\u65e0',rating:'5.0',tip:'\u4fef\u77b0\u4f5b\u7f57\u4f26\u8428\u5168\u666f\u00b7\u65e5\u843d\u673a\u4f4d'},
    '日落':{wc:'\u65e0',rating:'5.0',tip:'18:50\u00b7\u5168\u57ce\u91d1\u5149\u65f6\u523b'},
    'Il Latini':{wc:'\u6709',rating:'4.5',tip:'\u7535\u8bdd\u9884\u5b9a\u00b7\u65e0\u83dc\u5355\u6258\u65af\u5361\u7eb3\u5957\u9910'},
    '圣母百花穹顶':{wc:'\u6709',rating:'5.0',tip:'\u9884\u7ea6\u5fc5\u8981\u00b7\u767b463\u7ea7\u53f0\u9636'},
    'Nerbone':{wc:'\u6709',rating:'4.0',tip:'\u725b\u809a\u5305\u540d\u5e97\u00b7\u5e02\u573a\u5185\u5e97\u94fa'},
    'Vivoli':{wc:'\u6709',rating:'4.5',tip:'\u963f\u8299\u4f73\u6735\u00b7\u51b0\u6dc0\u6dcb+\u610f\u5f0f\u5496\u5561'},
    '红箭 9422':{wc:'\u7ad9\u5185',rating:'\u2014',tip:'\u9ad8\u94c1\u5230\u5a01\u5c3c\u65af'},
    '威尼斯':{wc:'\u7ad9\u5185',rating:'\u2014',tip:'\u51fa\u7ad9\u5373\u5b58\u7bb1'},
    'cicchetti':{wc:'\u6709',rating:'4.0',tip:'\u9152\u9986\u5de1\u6e38\u00b7\u968f\u5230\u968f\u5403'},
    'ACTV':{wc:'\u7ad9\u5185',rating:'\u2014',tip:'24h\u901a\u7968\u00b7\u8239\u4e0a\u8d2d\u4e70'},
    '帕兰卡':{wc:'\u6709',rating:'4.0',tip:'\u4e0b\u8239\u5165\u4f4f'},
    '朱代卡':{wc:'\u65e0',rating:'4.5',tip:'\u5317\u5cb8\u591c\u666f\u6563\u6b65'},
    '2 号线':{wc:'\u7ad9\u5185',rating:'\u2014',tip:'\u5230\u5723\u624e\u5361\u91cc\u4e9a'},
    '圣马可广场':{wc:'\u65e0',rating:'5.0',tip:'\u65e9\u6668\u4eba\u5c11\u00b7\u514d\u8d39\u00b7\u5236\u9ad8\u70b9\u673a\u4f4d'},
    '花神咖啡馆':{wc:'\u6709',rating:'4.5',tip:'300\u5e74\u5386\u53f2\u00b7\u4ee5\u524d\u5e97\u70b9\u54ea\u5410\u53f8'},
    '贡多拉':{wc:'\u65e0',rating:'4.5',tip:'30\u5206\u949f\u00b7\u8bb2\u4ef7\u540e\u4e0a\u8239'},
    'Osteria al Portego':{wc:'\u6709',rating:'4.5',tip:'\u5730\u9053\u5a01\u5c3c\u65af\u83dc\u00b7\u9700\u9884\u7ea6'},
    '圣马可大殿':{wc:'\u6709',rating:'5.0',tip:'\u514d\u8d39\u00b7\u9884\u7ea6\u53ef\u8df3\u961f'},
    '里亚托桥':{wc:'\u65e0',rating:'4.5',tip:'\u6865\u4e0a\u673a\u4f4d\u00b7Suso\u51b0\u6dc0\u6dcb'},
    '卡纳雷吉欧':{wc:'\u65e0',rating:'4.0',tip:'\u81ea\u7531\u6df1\u901b\u00b7\u672c\u5730\u4eba\u533a'},
    '1 号线':{wc:'\u7ad9\u5185',rating:'\u2014',tip:'\u5927\u8fd0\u6cb3\u5de1\u6e38\u00b7\u591c\u666f\u7f8e'},
    '车站取行李':{wc:'\u7ad9\u5185',rating:'\u2014',tip:'\u53d6\u7bb1\u540e\u7ad9\u53f0\u5019\u8f66'},
    '红箭 9762':{wc:'\u7ad9\u5185',rating:'\u2014',tip:'\u9ad8\u94c1\u5230\u7c73\u5170'},
    '米兰中央':{wc:'\u6709',rating:'4.0',tip:'\u5165\u4f4f\u00b7\u4e2d\u592e\u8f66\u7ad9\u65c1'},
    '楼下咖啡馆':{wc:'\u6709',rating:'4.0',tip:'\u7b80\u5355\u65e9\u9910\u00b7\u610f\u5f0f\u5496\u5561'},
    '米兰大教堂':{wc:'\u6709',rating:'5.0',tip:'\u5c4b\u9876\u5e73\u53f0\u00b7\u4fef\u77b0\u5168\u57ce'},
    '埃马努埃莱':{wc:'\u6709',rating:'4.5',tip:'\u5965\u65af\u66fc\u5546\u4e1a\u62f1\u5eca\u00b7\u8d2d\u7269'},
    '斯福尔扎城堡':{wc:'\u6709',rating:'4.5',tip:'\u514d\u8d39\u00b7\u4e2d\u5ead\u5916\u89c2'},
    '布雷拉':{wc:'\u6709',rating:'4.0',tip:'\u8f7b\u5348\u9910\u00b7\u753b\u5eca\u65c1'},
    '时尚四边形':{wc:'\u65e0',rating:'4.0',tip:'\u5962\u4ed7\u54c1\u8857\u00b7\u5f39\u6027\u5b89\u6392'},
    '伴手礼':{wc:'\u6709',rating:'4.0',tip:'\u91c7\u8d2d\u00b7\u5965\u65af\u66fc\u5546\u573a'},
    '回公寓':{wc:'\u6709',rating:'4.0',tip:'\u653e\u91c7\u8d2d\u7269\u00b7\u88c5\u7bb1'},
    '纳维利':{wc:'\u6709',rating:'4.5',tip:'\u8fd0\u6cb3\u666f\u89c2\u4f4d\u00b7\u9700\u7535\u8bdd\u786e\u8ba4'},
    'El Brellin':{wc:'\u6709',rating:'4.5',tip:'\u85cf\u7ea2\u82b1\u7329\u996d+\u7096\u725b\u819d+\u7c73\u5170\u70b8\u5c0f\u725b\u6392'},
    '回公寓装箱':{wc:'\u6709',rating:'4.0',tip:'\u660e\u65e9\u98de\u00b7\u88c5\u7bb1\u6574\u7406'},
    '去中央车站':{wc:'\u7ad9\u5185',rating:'\u2014',tip:'\u9000\u623f\u00b7\u63a8\u7bb1\u53bb\u8f66\u7ad9'},
    'T1 值机':{wc:'\u7ad9\u5185',rating:'\u2014',tip:'\u6258\u8fd0\u00b7\u9000\u7a0e\u67dc\u53f0\u5148\u76d6\u7ae0'},
    '次日晨到北京':{wc:'\u6709',rating:'\u2014',tip:'\u5230\u8fbe\u5317\u4eac'},
  };

compProto.trip=function(){
      var tid=this.__zzTripId||'italy2026';
      if(tid==='italy2026'){
        var days=origMethods.trip.call(this);
        if(!this._italyEnriched){
          days.forEach(function(day){(day.nodes||[]).forEach(function(nd){
            if(!nd.wc){
              for(var k in ITALY_ENRICH){
                if(nd.title&&nd.title.indexOf(k)>=0){nd.wc=ITALY_ENRICH[k].wc;nd.rating=ITALY_ENRICH[k].rating;nd.tip=ITALY_ENRICH[k].tip;break;}
              }
              if(!nd.wc){nd.wc='有';nd.rating='4.0';nd.tip='';}
            }
          });});
          this._italyEnriched=true;
        }
        return days;
      }
      var data=TRIP_DATA[tid];
      if(data&&data.tripFn){
        if(this._trip&&this.__zzTripCached===tid) return this._trip;
        this._trip=data.tripFn();
        this.__zzTripCached=tid;
        return this._trip;
      }
      return origMethods.trip.call(this);
    };

    // Override artFor()
    compProto.artFor=function(city){
      var tid=this.__zzTripId||'italy2026';
      if(tid==='italy2026') return origMethods.artFor.call(this,city);
      var data=TRIP_DATA[tid];
      if(data&&data.artFn){
        var A=data.artFn();
        return A[city]||A[Object.keys(A)[0]];
      }
      return origMethods.artFor.call(this,city);
    };

    // Override rtOf()
    compProto.rtOf=function(n){
      var tid=this.__zzTripId||'italy2026';
      if(tid==='italy2026') return origMethods.rtOf.call(this,n);
      var data=TRIP_DATA[tid];
      if(data&&data.rtFn){
        var R=data.rtFn();
        var r=R[n];
        if(!r) return {stops:[{label:'—',ni:0}],modes:['—']};
        return {stops:r.s.map(function(x){return {label:x[0],ni:x[1]};}),modes:r.m};
      }
      return origMethods.rtOf.call(this,n);
    };

    // Override gradOf()
    compProto.gradOf=function(city){
      var tid=this.__zzTripId||'italy2026';
      if(tid==='italy2026') return origMethods.gradOf.call(this,city);
      var data=TRIP_DATA[tid];
      if(data&&data.gradFn){
        var G=data.gradFn();
        return G[city]||G[Object.keys(G)[0]];
      }
      return origMethods.gradOf.call(this,city);
    };

    // Override preRaw()
    compProto.preRaw=function(){
      var tid=this.__zzTripId||'italy2026';
      if(tid==='italy2026') return origMethods.preRaw.call(this);
      var data=TRIP_DATA[tid];
      return data&&data.preFn?data.preFn():[];
    };

    // Override bookRaw()
    compProto.bookRaw=function(){
      var tid=this.__zzTripId||'italy2026';
      if(tid==='italy2026') return origMethods.bookRaw.call(this);
      var data=TRIP_DATA[tid];
      return data&&data.bookFn?data.bookFn():[];
    };

    // Override emgRaw()
    compProto.emgRaw=function(){
      var tid=this.__zzTripId||'italy2026';
      if(tid==='italy2026') return origMethods.emgRaw.call(this);
      var data=TRIP_DATA[tid];
      return data&&data.emgFn?data.emgFn():[];
    };

    // Override consRaw()
    compProto.consRaw=function(){
      var tid=this.__zzTripId||'italy2026';
      if(tid==='italy2026') return origMethods.consRaw.call(this);
      var data=TRIP_DATA[tid];
      return data&&data.consFn?data.consFn():[];
    };

    // Override nowInfo() - use dynamic day count instead of hardcoded 13
    compProto.nowInfo=function(){
      var days=this.trip(), now=this.nowDate();
      var maxDay=days.length;
      var d1=this.dateOf(days[0]);
      var dayN=Math.floor((new Date(now.getFullYear(),now.getMonth(),now.getDate())-d1)/86400000)+1;
      var nowMin=now.getHours()*60+now.getMinutes();
      if(dayN<1) return {phase:'pre',dayN:0,nowMin:nowMin,cd:Math.ceil((d1-now)/86400000)};
      if(dayN>maxDay) return {phase:'post',dayN:maxDay+1,nowMin:nowMin,cd:0};
      return {phase:'in',dayN:dayN,nowMin:nowMin,cd:0};
    };

    // Override setP() - clamp day/todoDay to trip length
    compProto.setP=function(p){
      var maxDay=this.trip().length;
      if(p.day&&p.day>maxDay) p.day=maxDay;
      if(p.day&&p.day<1) p.day=1;
      if(p.todoDay&&p.todoDay>maxDay) p.todoDay=maxDay;
      if(p.todoDay&&p.todoDay<1) p.todoDay=1;
      return origMethods.setP.call(this,p);
    };


    // Override pickDay() - clamp day to trip length
    compProto.pickDay=function(n){
      var maxDay=this.trip().length;
      if(n>maxDay) n=maxDay;
      if(n<1) n=1;
      return origMethods.pickDay.call(this,n);
    };
    // Override componentDidMount() - capture instance
    compProto.componentDidMount=function(){
      compInst=this;
      var tid=state.tripId||'italy2026';
      this.__zzTripId=tid;
      // Adjust LSK for non-italy trips
      var data=TRIP_DATA[tid];
      if(data) this.LSK=data.LSK;
      // Set the trip year so dateOf()/nowDate()/nowInfo() compute the right phase.
      if(data&&data.Y) this.Y=data.Y;
      origMethods.componentDidMount.call(this);
    };

    // Override renderVals() - fix hardcoded 13s and Italy-specific strings
    compProto.renderVals=function(){
      var result=origMethods.renderVals.call(this);
      var tid=this.__zzTripId||'italy2026';
      if(tid==='italy2026') return result;
      var data=TRIP_DATA[tid];
      if(!data) return result;
      var maxDay=this.trip().length;
      var days=this.trip();
      var self=this;

      // Fix ovHeroSub (post-trip default subtitle)
      if(result.ovHeroSub&&typeof result.ovHeroSub==='string'){
        result.ovHeroSub=maxDay+' 天 · '+days[0].date+'–'+days[days.length-1].date+' · '+data.overviewSub;
      }
      // Fix ovHeroTitle (post-trip default)
      if(result.ovHeroTitle&&typeof result.ovHeroTitle==='string'){
        result.ovHeroTitle=data.titleSub;
      }
      // Fix dailyEmptySub (D1-D13 -> D1-D{maxDay})
      if(result.dailyEmptySub&&typeof result.dailyEmptySub==='string'){
        result.dailyEmptySub=result.dailyEmptySub.replace(/D1–D\d+/,'D1–D'+maxDay);
      }
      // Fix emgScope (Italy -> country name)
      if(result.emgScope&&typeof result.emgScope==='string'){
        result.emgScope=result.emgScope.replace(/意大利/,data.country);
      }
      // Fix emgNext (clamp to maxDay)
      result.emgNext=function(){return self.setP({todoDay:Math.min(maxDay,(self.state.todoDay||0)+1)});};

      return result;
    };

    return true;
  }

  /* ===== FIND COMPONENT INSTANCE VIA REACT FIBER TREE ===== */
  function findCompInst(){
    var rootEl=document.getElementById('dc-root')||document.getElementById('root');
    if(!rootEl) return null;
    var fk=null;
    for(var k in rootEl){
      var kl=k.toLowerCase();
      if(kl.indexOf('__reactfiber')===0||kl.indexOf('__reactinternalinstance')===0||kl.indexOf('__reactcontainer')===0){
        fk=k;break;
      }
    }
    if(!fk) return null;
    var fiber=rootEl[fk];
    var q=[fiber];
    var seen=0;
    while(q.length>0&&seen<500){
      var f=q.shift();seen++;
      if(!f) continue;
      if(f.stateNode&&f.stateNode.logic){
        return f.stateNode.logic;
      }
      if(f.child) q.push(f.child);
      if(f.sibling) q.push(f.sibling);
    }
    return null;
  }

  /* ===== TRIP SWITCHING ===== */
  function switchToTrip(tripId){
    if(!compInst){
      compInst=findCompInst();window.__ZZ_COMP=compInst;
      if(!compInst) return;
    }
    // Save current state
    try{compInst.persist();}catch(e){}

    // Switch trip ID
    compInst.__zzTripId=tripId;
    compInst.__zzTripCached=null;
    compInst._trip=null;

    // Save original Italy LSK before changing
    if(!window.__ZZ_ITALY_LSK&&compInst.LSK){
      window.__ZZ_ITALY_LSK=compInst.LSK;
    }
    // Update LSK
    if(tripId==='italy2026'){
      if(window.__ZZ_ITALY_LSK) compInst.LSK=window.__ZZ_ITALY_LSK;
    }else{
      var data=TRIP_DATA[tripId];
      if(data) compInst.LSK=data.LSK;
    }
    // Update the trip year BEFORE nowInfo(): dateOf()/nowDate() read this.Y, so a
    // 2027 trip left at Italy's 2026 would compute as long past ("旅行已结束").
    var _yd=TRIP_DATA[tripId];
    if(_yd&&_yd.Y) compInst.Y=_yd.Y;

    // Reset state for new trip
    var ni=compInst.nowInfo();
    var landDay=ni.phase==='in'?ni.dayN:1;
    var saved=null;
    try{saved=JSON.parse(localStorage.getItem(compInst.LSK)||'null');}catch(e){}

    compInst.setState({
      day:(saved&&saved.day)||landDay,
      view:(saved&&saved.view)||'today',
      todoSec:(saved&&saved.todoSec)||'daily',
      todoDay:(saved&&saved.todoDay!=null)?saved.todoDay:(ni.phase==='in'?ni.dayN:0),
      doneDaily:(saved&&saved.doneDaily)||{},
      donePre:(saved&&saved.donePre)||{},
      doneBook:(saved&&saved.doneBook)||{},
      sheetOpen:false,
      altIdx:-1
    },function(){
      try{compInst.scrollRail(compInst.state.day);}catch(e){}try{compInst.forceUpdate();}catch(e){}switchMapSystem(tripId);setTimeout(patchTitleBar,100);
    });
  }

  /* ===== DOM PATCHING (fix hardcoded Italy strings) ===== */
  var lastPatchedTrip=null;
  // Italy original values for title restoration
  var ITALY_TITLE='意大利 · 9.24–10.6';
  var ITALY_STATS='13D · 9.24–10.6 · 6 城';
  var ITALY_COUNTRY='意大利';
  var ITALY_MAXDAY=13;
  function patchTitleBar(){
    var tid=state.tripId||'italy2026';
    if(tid===lastPatchedTrip&&compInst) return;
    var newText,newStats,country,maxDay;
    if(tid==='italy2026'){
      newText=ITALY_TITLE;newStats=ITALY_STATS;country=ITALY_COUNTRY;maxDay=ITALY_MAXDAY;
    }else{
      var data=TRIP_DATA[tid];
      if(!data) return;
      var days=compInst?compInst.trip():null;
      if(!days||!days.length) return;
      newText=data.country+' · '+days[0].date+'–'+days[days.length-1].date;
      maxDay=days.length;
      var cityCount=data.titleSub.split(' → ').length;
      newStats=maxDay+'D · '+days[0].date+'–'+days[days.length-1].date+' · '+cityCount+' 城';
      country=data.country;
    }

    // Walk all text nodes and fix any that match trip title patterns
    var walker=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT,null,false);
    var node;
    var toFix=[];
    while(node=walker.nextNode()){
      if(node.parentElement&&node.parentElement.tagName==='SCRIPT') continue;
      var t=node.textContent;
      // Match: 'Country · date–date' pattern (title bar)
      if(/^[^ ]+ · \d{1,2}\.\d{1,2}–\d{1,2}\.\d{1,2}$/.test(t.trim())){
        toFix.push({node:node,text:newText});
      }
      // Match: 'XXD · date–date · X 城' pattern (overview stats)
      else if(/^\d+D · \d{1,2}\.\d{1,2}–\d{1,2}\.\d{1,2} · \d+ 城$/.test(t.trim())){
        toFix.push({node:node,text:newStats});
      }
      // Match: 'Country N 日' (card title in trip list - skip if in trip list)
      // Match: '13 天均在意大利' or similar
      else if(t.indexOf('天均在')>=0){
        toFix.push({node:node,text:t.replace(/\d+ 天均在[^ ]+/,maxDay+' 天均在'+country)});
      }
    }
    toFix.forEach(function(f){f.node.textContent=f.text;});
    lastPatchedTrip=tid;
  }

/* ===== MAP SYSTEM OVERRIDE ===== */
  if(!window.__ZZ_MAPS_ITALY && window.__ZZ_MAPS){
    window.__ZZ_MAPS_ITALY=window.__ZZ_MAPS.slice();
  }


  /* ===== GEOGRAPHIC MAP DATA ===== */
  var POI_POS={
    '东京':[['新宿',510,185],['浅草',780,130],['上野',700,120],['秋叶原',760,180],['成田',950,80],['御苑',540,210],['黄金街',480,220],['酒店',500,195],['回酒店',500,195],['银座',650,280],['地铁',650,210],['退房',500,185],['居酒屋',470,230],['烧鸟',490,235],['步',530,200]],
    '箱根':[['汤谷',130,390],['强罗',420,340],['大涌',560,270],['桃源',600,340],['箱根町',650,400],['元箱根',620,440],['神社',630,440],['旅馆',200,420],['温泉',250,410],['风吕',250,410],['退房',130,390],['巴士',580,430],['缆车',520,310],['海盗',630,380],['足汤',200,410],['散步',220,415]],
    '京都':[['京都站',200,420],['祇园',580,340],['锦市场',400,330],['清水寺',540,380],['二年坂',560,370],['三年坂',570,365],['八坂',600,345],['花见小路',590,340],['伏见',220,460],['稻荷',230,470],['千本',240,480],['岚山',100,320],['竹林',110,330],['渡月',90,340],['天龙',130,330],['法轮',110,340],['吉兆',100,340],['旅馆',580,350],['回旅馆',580,350],['退房',200,360],['小火车',110,320],['下山',230,420],['转车',200,400],['入住',580,350],['午餐',400,330],['豆腐',110,340]],
    '奈良':[['奈良',200,350],['公园',400,300],['喂鹿',400,300],['东大寺',480,260],['大佛',490,260],['奈良町',350,380],['午餐',350,380],['寄存',200,420],['退房',200,350],['取行李',200,420],['站',200,420]],
    '大阪':[['大阪',400,400],['酒店',400,280],['入住',400,280],['回酒店',400,280],['大阪城',760,320],['道顿堀',500,460],['心斋桥',400,440],['黑门',300,350],['章鱼烧',500,460],['烧串',510,465],['退房',400,280],['新大阪',200,200],['关西',950,100],['值机',950,100],['安检',960,100]],
    '雷克雅未克':[['凯夫拉',950,100],['机场',950,100],['租车',920,120],['到雷克',200,300],['入住',200,300],['Dill',250,320],['午夜',200,180],['散步',200,200],['出发',950,100],['起飞',950,100],['降落',950,100]],
    '南岸':[['出发',180,300],['辛格维',400,280],['盖锡',480,300],['黄金',520,320],['瀑布',520,320],['间歇泉',480,300],['午餐',500,330],['南下',600,480],['塞里雅',620,480],['斯科加',700,500],['酒店',720,520],['夜景',720,530]],
    '冰河湖':[['出发',100,480],['维克',200,440],['黑沙滩',180,500],['迪霍',220,520],['午餐',200,440],['东行',500,480],['杰古',780,420],['冰河',780,420],['钻石',800,530],['酒店',850,480],['Hali',850,480],['龙虾',850,470],['极昼',780,400],['海岬',220,520]],
    '北部':[['出发',100,480],['东部峡',150,450],['都皮',200,430],['加油',280,450],['埃伊',300,440],['北段',500,420],['米湖',420,250],['温泉',420,250],['地热',440,260],['众神',700,200],['阿克雷',900,180],['入住',900,200],['Rub',910,210],['午夜',900,160]],
    '斯奈山':[['退房',900,200],['西行',700,350],['斯奈山',400,250],['教会山',300,200],['Kirkju',300,200],['Bú',250,280],['黑教堂',250,280],['午餐',200,280],['Arnar',150,250],['海蚀',180,300],['返回',500,450],['雷克雅',800,480],['加油',850,480],['还车',950,100],['凯夫拉',950,100],['机场',950,100],['起飞',950,100]]
  };
  var GEO={
    '东京':{water:[{pts:[[820,440],[980,440],[980,620],[820,620]],n:'東京湾'}],park:[{pts:[[500,170],[580,170],[580,240],[500,240]],n:'新宿御苑'}],rail:[{pts:[[100,180],[820,180]],n:'JR中央線'},{pts:[[500,140],[500,180]],n:'山手線'},{pts:[[780,200],[780,440]],n:'銀座線'}],roads:[{pts:[[60,200],[940,200]],n:'青梅街道',w:10},{pts:[[500,60],[500,560]],n:'歌舞伎町大通り',w:8}]},
    '箱根':{water:[{pts:[[680,360],[820,360],[820,480],[680,480]],n:'芦ノ湖'}],park:[],rail:[{pts:[[120,400],[400,360]],n:'小田急浪漫号'},{pts:[[400,360],[480,320]],n:'登山電車'},{pts:[[480,320],[560,280]],n:'箱根缆車'},{pts:[[600,340],[680,380]],n:'海賊船'}],roads:[{pts:[[120,400],[400,360]],n:'国道1号',w:8},{pts:[[560,280],[680,460]],n:'箱根観光道路',w:6}]},
    '京都':{water:[{pts:[[400,480],[500,480],[500,560],[400,560]],n:'鴨川'}],park:[],rail:[{pts:[[60,400],[940,400]],n:'JR京都線'},{pts:[[200,360],[600,360]],n:'阪急京都線'}],roads:[{pts:[[200,360],[200,560]],n:'烏丸通',w:8},{pts:[[200,360],[600,360]],n:'四条通',w:8}]},
    '奈良':{water:[],park:[{pts:[[300,200],[580,200],[580,420],[300,420]],n:'奈良公園'}],rail:[{pts:[[120,420],[420,420]],n:'JR奈良線'}],roads:[{pts:[[120,420],[420,300]],n:'国道163号',w:8}]},
    '大阪':{water:[{pts:[[860,500],[980,500],[980,620],[860,620]],n:'大阪湾'}],park:[{pts:[[700,280],[820,280],[820,380],[700,380]],n:'大阪城公園'}],rail:[{pts:[[60,400],[940,400]],n:'JR大阪環状線'},{pts:[[400,200],[400,500]],n:'御堂筋線'}],roads:[{pts:[[400,200],[400,500]],n:'御堂筋',w:10},{pts:[[60,400],[860,400]],n:'中央大通',w:8}]},
    '雷克雅未克':{water:[{pts:[[60,60],[940,60],[940,160],[60,160]],n:'北大西洋'}],park:[],rail:[],roads:[{pts:[[200,200],[800,400]],n:'Route 41',w:8},{pts:[[200,200],[200,400]],n:'Laugavegur',w:6}]},
    '南岸':{water:[],park:[{pts:[[400,200],[600,200],[600,400],[400,400]],n:'辛格維利爾國家公園'}],rail:[],roads:[{pts:[[60,560],[940,560]],n:'Route 1 (Ring Road)',w:12},{pts:[[180,300],[400,300]],n:'Route 36',w:8}]},
    '冰河湖':{water:[{pts:[[760,360],[940,360],[940,500],[760,500]],n:'Jokulsarlon'},{pts:[[740,500],[860,500],[860,580],[740,580]],n:'鑽石海灘'}],park:[],rail:[],roads:[{pts:[[60,480],[940,480]],n:'Route 1',w:12}]},
    '北部':{water:[{pts:[[400,200],[520,200],[520,300],[400,300]],n:'Myvatn'}],park:[],rail:[],roads:[{pts:[[60,480],[940,480]],n:'Route 1',w:12},{pts:[[940,480],[940,200]],n:'Route 87',w:8}]},
    '斯奈山':{water:[{pts:[[60,60],[940,60],[940,140],[60,140]],n:'Breidafjordur'}],park:[],rail:[],roads:[{pts:[[60,480],[940,480]],n:'Route 1',w:12},{pts:[[300,480],[300,200]],n:'Route 54',w:8}]}
  };
  function generateMapsForTrip(tripId){
    var data=TRIP_DATA[tripId];
    if(!data||!data.tripFn) return [];
    var days=data.tripFn();
    var maps=[];
    days.forEach(function(day){
      var nodes=day.nodes||[];
      if(nodes.length===0) return;
      var W=1000,H=620;
      var g=GEO[day.city]||{water:[],park:[],rail:[],roads:[]};
      var posLookup=POI_POS[day.city]||[];
      function posFor(node,i){
        var title=node.title||'';
        var bestMatch=null,bestLen=0;
        for(var pi=0;pi<posLookup.length;pi++){
          var entry=posLookup[pi];
          var key=entry[0];
          if(key.length<=bestLen) continue;
          if(title.indexOf(key)>=0){bestMatch=entry;bestLen=key.length;}
        }
        if(bestMatch) return {x:bestMatch[1],y:bestMatch[2]};
        var spread=Math.min(700,120+i*(700/Math.max(nodes.length,1)));
        return {x:120+spread,y:300+Math.sin(i*0.8)*80};
      }
      var pois=[],routePaths=[],notes=[];
      var roads=(g.roads||[]).map(function(r){return {pts:r.pts,n:r.n,w:r.w||8};});
      var water=(g.water||[]).map(function(w){return {pts:w.pts,n:w.n||''};});
      var park=(g.park||[]).map(function(p){return {pts:p.pts,n:p.n||''};});
      var rail=(g.rail||[]).map(function(r){return {pts:r.pts,n:r.n||''};});
      var prevXY=null;
      nodes.forEach(function(node,i){
        var title=node.title||'',t=node.t||'';
        var xy=posFor(node,i);
        var x=Math.max(40,Math.min(960,xy.x)),y=Math.max(50,Math.min(570,xy.y));
        var ptype='si';
        if(title.indexOf('机场')>=0||title.indexOf('降落')>=0||title.indexOf('起飞')>=0||t.indexOf('CA')>=0||title.indexOf('值机')>=0||title.indexOf('安检')>=0) ptype='st';
        else if(title.indexOf('晚餐')>=0||title.indexOf('午餐')>=0||title.indexOf('居酒屋')>=0||title.indexOf('Dill')>=0||title.indexOf('Rub')>=0||title.indexOf('Hali')>=0||title.indexOf('烧鸟')>=0||title.indexOf('龙虾')>=0||title.indexOf('章鱼')>=0||title.indexOf('早餐')>=0) ptype='fd';
        else if(title.indexOf('酒店')>=0||title.indexOf('入住')>=0||title.indexOf('Ryokan')>=0||title.indexOf('Hotel')>=0||title.indexOf('旅馆')>=0||title.indexOf('温泉')>=0||title.indexOf('风吕')>=0||title.indexOf('回酒店')>=0||title.indexOf('回旅馆')>=0) ptype='ht';
        else if(title.indexOf('港口')>=0||title.indexOf('码头')>=0||title.indexOf('海盗船')>=0||title.indexOf('渡轮')>=0) ptype='pt';
        else if(title.indexOf('站')>=0||title.indexOf('地铁')>=0||title.indexOf('巴士')>=0||title.indexOf('JR')>=0||title.indexOf('新干线')>=0||t.indexOf('🚄')>=0||title.indexOf('公路')>=0||title.indexOf('HARUKA')>=0||title.indexOf('特急')>=0) ptype='st';
        else if(title.indexOf('寺')>=0||title.indexOf('神社')>=0||title.indexOf('公园')>=0||title.indexOf('瀑布')>=0||title.indexOf('教堂')>=0||title.indexOf('海岬')>=0||title.indexOf('湖')>=0||title.indexOf('沙滩')>=0||title.indexOf('教会')>=0) ptype='si';
        var time=(node.t||'').replace(/^(\d{1,2}:\d{2}).*/,'$1');
        var anchor=x>650?'l':(x<200?'r':(y>480?'t':''));
        pois.push([x,y,ptype,title.substring(0,22),time,anchor]);
        if(prevXY){
          var mode='walk';
          if(t.indexOf('🚄')>=0||title.indexOf('新干线')>=0||title.indexOf('JR')>=0||title.indexOf('地铁')>=0||title.indexOf('巴士')>=0||title.indexOf('缆车')>=0||title.indexOf('电车')>=0||title.indexOf('浪漫号')>=0||title.indexOf('HARUKA')>=0||title.indexOf('特急')>=0) mode='ride';
          else if(title.indexOf('海盗船')>=0||title.indexOf('渡')>=0||title.indexOf('船')>=0) mode='sea';
          routePaths.push({pts:[[prevXY.x,prevXY.y],[x,y]],k:mode});
        }
        prevXY={x:x,y:y};
        if(ptype==='st') notes.push([x,y+25,'换乘']);
      });
      notes.push([W-130,H-25,day.city+' · '+day.date]);
      maps.push({id:tripId.substring(0,2)+'d'+day.n,day:day.n,t:day.sum||day.city,s:day.route||'',W:W,H:H,water:water,park:park,rail:rail,roads:roads,route:routePaths,pois:pois,notes:notes,city:day.city,date:day.date});
    });
    return maps;
  }

  var currentMapTrip='italy2026';
  function switchMapSystem(tripId){
    // Save Italy maps at runtime if not saved yet
    if(!window.__ZZ_MAPS_ITALY&&window.__ZZ_MAPS&&window.__ZZ_MAPS.length>0){
      window.__ZZ_MAPS_ITALY=window.__ZZ_MAPS.slice();
    }
    if(tripId===currentMapTrip) return;
    if(tripId==='italy2026'){
      if(window.__ZZ_MAPS_ITALY){
        window.__ZZ_MAPS.length=0;
        window.__ZZ_MAPS_ITALY.forEach(function(m){window.__ZZ_MAPS.push(m);});
      }
    } else {
      var newMaps=generateMapsForTrip(tripId);
      if(newMaps.length>0){
        window.__ZZ_MAPS.length=0;
        newMaps.forEach(function(m){window.__ZZ_MAPS.push(m);});
      }
      if(compInst){
        var day=compInst.state?compInst.state.day:1;
        var maxDay=compInst.trip().length;
        try{
          var saved=JSON.parse(localStorage.getItem('zouzhe_italy_2026_v1')||'{}');
          saved.day=Math.min(day,maxDay);
          localStorage.setItem('zouzhe_italy_2026_v1',JSON.stringify(saved));
        }catch(e){}
      }
    }
    currentMapTrip=tripId;
    patchMapOverlay(tripId);
  }

  function patchMapOverlay(tripId){
    var ov=document.querySelector('.zz-ov');
    if(!ov) return;
    var data=TRIP_DATA[tripId];
    if(!data||!data.tripFn) return;
    var days=data.tripFn();
    var maxDay=days.length;
    var dayContainer=ov.querySelector('.zz-days');
    if(dayContainer){
      while(dayContainer.firstChild) dayContainer.removeChild(dayContainer.firstChild);
      for(var d=1;d<=maxDay;d++){
        var b=document.createElement('button');
        b.className='zz-day';
        var dateStr=days[d-1]?days[d-1].date:'';
        b.innerHTML='D'+d+'<span>'+dateStr+'<\/span>';
        dayContainer.appendChild(b);
      }
    }
  }

  if(!window.__zzMapObserverSetup){
    window.__zzMapObserverSetup=true;
    var mapObserver=new MutationObserver(function(mutations){
      mutations.forEach(function(m){
        if(m.attributeName==='class'&&m.target.classList&&m.target.classList.contains('on')&&m.target.classList.contains('zz-ov')){
          if(currentMapTrip!=='italy2026'){
            patchMapOverlay(currentMapTrip);
          }
        }
      });
    });
    setTimeout(function(){
      function tryObserve(){
        var ov=document.querySelector('.zz-ov');
        if(ov){
          mapObserver.observe(ov,{attributes:true,attributeFilter:['class']});
        } else {
          var rc=0;
          var ri=setInterval(function(){
            var ov2=document.querySelector('.zz-ov');
            if(ov2){mapObserver.observe(ov2,{attributes:true,attributeFilter:['class']});clearInterval(ri);}
            else if(++rc>60){clearInterval(ri);}
          },500);
        }
      }
      tryObserve();
    },2000);
  }

/* ===== UI STATE MANAGEMENT ===== */
  var state={screen:'list',tripId:null,tripView:'overview'};
  function loadState(){try{var s=JSON.parse(localStorage.getItem(MTK)||'{}');if(s.screen)state.screen=s.screen;if(s.tripId)state.tripId=s.tripId;if(s.tripView)state.tripView=s.tripView;}catch(e){}}
  function saveState(){try{localStorage.setItem(MTK,JSON.stringify({screen:state.screen,tripId:state.tripId,tripView:state.tripView}));}catch(e){}}

  function mkEl(t,s,h){var e=document.createElement(t);if(s)e.setAttribute('style',s);if(h!==undefined)e.innerHTML=h;return e;}

  var tripListEl=null;
  function buildTripList(){
    tripListEl=mkEl('div','position:fixed;inset:0;z-index:50;background:var(--zz-bg,#0A0F1C);overflow-y:auto;overflow-x:hidden;-webkit-overflow-scrolling:touch;font-family:Noto Sans SC,system-ui,-apple-system,sans-serif;color:var(--zz-text,#D8E6F0);transition:transform .3s ease,opacity .3s ease;display:none;');
    tripListEl.id='zz-trip-list';
    var header=mkEl('div','padding:60px 20px 12px;position:sticky;top:0;background:linear-gradient(180deg,var(--zz-bg,#0A0F1C) 70%,transparent);z-index:1;');
    header.appendChild(mkEl('div','font-size:28px;font-weight:700;letter-spacing:2px;color:var(--zz-text,#D8E6F0);','行程'));
    var hSub=mkEl('div','font-size:12px;color:var(--zz-dim,#5E7186);margin-top:4px;');
    hSub.textContent=TRIPS.length+' 个行程 · 点击进入';
    header.appendChild(hSub);
    // Theme toggle button (same position as app top bar)
    var themeBtn=mkEl('button','position:absolute;top:60px;right:20px;width:34px;height:34px;display:flex;align-items:center;justify-content:center;background:none;border:none;color:var(--zz-cyan,#00F0FF);cursor:pointer;padding:0;-webkit-tap-highlight-color:transparent;z-index:2;');
    themeBtn.id='zz-list-theme';
    themeBtn.setAttribute('aria-label','深浅色切换');
    var isLight=false;try{isLight=localStorage.getItem('zz_theme')==='light';}catch(e){}
    themeBtn.innerHTML=isLight?'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/></svg>':'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><circle cx="12" cy="12" r="4.5"/><path d="M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3M5 5l2 2M17 17l2 2M19 5l-2 2M7 17l-2 2"/></svg>';
    function updateThemeBtnIcon(){
      var isLight=document.documentElement.classList.contains('zz-light');
      themeBtn.innerHTML=isLight?'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/></svg>':'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><circle cx="12" cy="12" r="4.5"/><path d="M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3M5 5l2 2M17 17l2 2M19 5l-2 2M7 17l-2 2"/></svg>';
    }
    themeBtn.addEventListener('click',function(e){
      e.preventDefault();e.stopPropagation();
      // Try to trigger the app's built-in theme toggle via .zz-tbtheme
      var appThemeBtn=document.querySelector('.zz-tbtheme');
      if(appThemeBtn){
        appThemeBtn.click();
        setTimeout(updateThemeBtnIcon,50);
      }else{
        // Fallback: toggle manually
        var light=false;try{light=localStorage.getItem('zz_theme')==='light';}catch(err){}
        var newMode=light?'dark':'light';
        try{localStorage.setItem('zz_theme',newMode);}catch(err){}
        document.documentElement.classList.toggle('zz-light',!light);
        // Tag app holder for invert filter
        var divs=document.getElementsByTagName('div');
        for(var di=0;di<divs.length;di++){
          var st=divs[di].getAttribute('style')||'';
          if(st.indexOf('520px')>=0&&st.indexOf('100dvh')>=0){
            var hold=divs[di].parentElement&&divs[di].parentElement!==document.body?divs[di].parentElement:divs[di];
            if(!hold.classList.contains('zz-apphold'))hold.classList.add('zz-apphold');
            break;
          }
        }
        updateThemeBtnIcon();
      }
      // Force re-render
      if(tripListEl){var od=tripListEl.style.display;tripListEl.style.display='none';tripListEl.style.display=od;}
    });
    header.appendChild(themeBtn);
    tripListEl.appendChild(header);
    var list=mkEl('div','padding:4px 16px 80px;');
    var svgNs='http://www.w3.org/2000/svg';
    TRIPS.forEach(function(trip){
      var card=mkEl('div','background:var(--zz-panel,rgba(255,255,255,0.03));border:1px solid var(--zz-line,rgba(0,240,255,0.1));border-radius:16px;overflow:hidden;margin-bottom:14px;cursor:pointer;transition:border-color .2s,box-shadow .2s;position:relative;');
      var cover=mkEl('div','height:140px;background:'+trip.cover+';position:relative;overflow:hidden;');
      var svg=document.createElementNS(svgNs,'svg');
      svg.setAttribute('viewBox','0 0 400 140');
      svg.style.cssText='position:absolute;inset:0;width:100%;height:100%;';
      var c=document.createElementNS(svgNs,'circle');
      c.setAttribute('cx','320');c.setAttribute('cy','40');c.setAttribute('r','18');
      c.setAttribute('fill',trip.accent);c.setAttribute('opacity','0.8');
      svg.appendChild(c);
      var p=document.createElementNS(svgNs,'path');
      p.setAttribute('d','M0 140 L80 90 L140 110 L200 70 L280 100 L340 60 L400 90 L400 140 Z');
      p.setAttribute('fill','none');p.setAttribute('stroke',trip.accent);
      p.setAttribute('stroke-width','2');p.setAttribute('opacity','0.4');
      svg.appendChild(p);
      cover.appendChild(svg);
      cover.appendChild(mkEl('div','position:absolute;top:12px;right:12px;font-size:11px;padding:3px 10px;border-radius:20px;background:rgba(0,0,0,0.4);color:'+trip.accent+';border:1px solid '+trip.accent+';',trip.statusLabel));
      cover.appendChild(mkEl('div','position:absolute;bottom:12px;left:12px;font-size:12px;font-weight:600;color:#fff;text-shadow:0 1px 4px rgba(0,0,0,0.5);',trip.days+' 天'));
      card.appendChild(cover);
      var info=mkEl('div','padding:16px;');
      info.appendChild(mkEl('div','font-size:18px;font-weight:700;color:var(--zz-text,#D8E6F0);',trip.title));
      info.appendChild(mkEl('div','font-size:12px;color:var(--zz-dim,#5E7186);margin-top:2px;',trip.subtitle));
      info.appendChild(mkEl('div','font-size:12px;color:var(--zz-sub,#9FB6C9);margin-top:8px;line-height:1.5;',trip.cities));
      card.appendChild(info);
      var arrow=mkEl('div','position:absolute;right:16px;top:50%;transform:translateY(-50%) translateX(40px);font-size:24px;color:var(--zz-dim,#5E7186);transition:transform .2s,color .2s;','›');
      card.appendChild(arrow);
      card.addEventListener('mouseenter',function(){card.style.borderColor='var(--zz-cyan,#00F0FF)';card.style.boxShadow='0 0 20px rgba(0,240,255,0.08)';arrow.style.transform='translateY(-50%) translateX(0)';arrow.style.color='var(--zz-cyan,#00F0FF)';});
      card.addEventListener('mouseleave',function(){card.style.borderColor='var(--zz-line,rgba(0,240,255,0.1))';card.style.boxShadow='none';arrow.style.transform='translateY(-50%) translateX(40px)';arrow.style.color='var(--zz-dim,#5E7186)';});
      card.addEventListener('click',function(){enterTrip(trip.id);});
      list.appendChild(card);
    });
    tripListEl.appendChild(list);
    var footer=mkEl('div','padding:20px;text-align:center;font-size:11px;color:var(--zz-dim,#5E7186);');
    footer.textContent='走哲Pro · 多行程管理 v2.0';
    tripListEl.appendChild(footer);
    document.body.appendChild(tripListEl);
  }

  function enterTrip(tripId){
    state.tripId=tripId;state.screen='detail';state.tripView='overview';
    
    saveState();
    // Push 1 history state for back navigation (overview->list)
    if(window.history&&window.history.pushState){
      window.history.pushState({zz:1},'','');
    }
    // Switch component data
    switchToTrip(tripId);
    showDetail();
    // Switch to overview tab
    if(compInst){
      compInst.setP({view:'overview',sheetOpen:false});
      try{compInst.forceUpdate();}catch(e){}setTimeout(patchTitleBar,200);
    }
  }

  function exitToOverview(){
    if(compInst) compInst.setP({view:'overview',sheetOpen:false});
    state.tripView='overview';
    saveState();
  }

  function exitToList(){
    state.screen='list';state.tripView='overview';
    saveState();
    showList();
  }

  function showList(){
    if(tripListEl){tripListEl.style.display='block';tripListEl.style.transform='translateX(0)';tripListEl.style.opacity='1';}
    hideAppContent();
  }

  function showDetail(){
    if(tripListEl){tripListEl.style.transform='translateX(-100%)';tripListEl.style.opacity='0';setTimeout(function(){if(state.screen==='detail')tripListEl.style.display='none';},300);}
    showAppContent();
  }

  function showAppContent(){var r=document.getElementById('dc-root')||document.getElementById('root')||document.querySelector('[data-dc-root]');if(r)r.style.display='';var x=document.querySelector('x-dc');if(x)x.style.display='';}
  function hideAppContent(){var r=document.getElementById('dc-root')||document.getElementById('root')||document.querySelector('[data-dc-root]');if(r)r.style.display='none';var x=document.querySelector('x-dc');if(x)x.style.display='none';}

  /* ===== EDGE SWIPE NAVIGATION ===== */
  var es={active:false,x:0,y:0,t:0};var EDGE=40,SWIPE_D=50,SWIPE_T=600;var ind=null;
  function buildInd(){ind=mkEl('div','position:fixed;left:0;top:0;bottom:0;width:3px;background:linear-gradient(180deg,transparent,'+CY+',transparent);z-index:100;opacity:0;transition:opacity .15s,width .15s;pointer-events:none;');document.body.appendChild(ind);}
  function tsStart(e){if(state.screen!=='detail')return;var t=e.touches[0];if(!t)return;if(t.clientX<=EDGE){es.active=true;es.x=t.clientX;es.y=t.clientY;es.t=Date.now();if(ind){ind.style.opacity='0.5';ind.style.width='4px';}}}
  function tsMove(e){if(!es.active)return;var t=e.touches[0];if(!t)return;var dx=t.clientX-es.x;if(dx>0&&ind){ind.style.opacity=String(Math.min(0.8,0.3+dx/200));ind.style.width=Math.min(8,3+dx/30)+'px';}}
  function tsEnd(e){if(!es.active)return;es.active=false;if(ind){ind.style.opacity='0';ind.style.width='3px';}var t=e.changedTouches[0];if(!t)return;var dx=t.clientX-es.x,dy=Math.abs(t.clientY-es.y),dt=Date.now()-es.t;if(dx>=SWIPE_D&&dx>dy*2&&dt<SWIPE_T)handleBack();}
  /* ===== NAVIGATION HIERARCHY =====
     trip list -> overview -> today/todo -> (node sheet | map overlay)
     Back moves up exactly one level. Model: while inside a trip there is always
     exactly ONE extra history entry ("sentinel"). enterTrip pushes it once; every
     intercepted back that stays inside a trip re-pushes it; the back that reaches
     the trip list does NOT re-push, so the following back pops the base and lets
     the app exit. The underlying React app pushes no history of its own. */
  function zzGoUp(){
    if(state.screen!=='detail') return 'none';
    // 1. map overlay open -> just close it (stay on the current level)
    var mapOv=document.querySelector('.zz-ov.on');
    if(mapOv){ mapOv.classList.remove('on'); return 'stay'; }
    // 2. node detail sheet (票根/厕所/节点详情) open -> close, stay in today/todo
    if(compInst&&compInst.state&&compInst.state.sheetOpen){
      try{compInst.setP({sheetOpen:false});}catch(e){}
      return 'stay';
    }
    // 3. today/todo -> overview
    var cv=compInst&&compInst.state?compInst.state.view:(state.tripView||'overview');
    if(cv==='today'||cv==='todo'){ exitToOverview(); showToast('返回总览'); return 'stay'; }
    // 4. overview -> trip list
    exitToList(); showToast('返回行程列表'); return 'list';
  }
  /* Edge swipe funnels through the SAME path as the system back button (a single
     source of truth): trigger a history back, which is handled in popstate. */
  function handleBack(){
    if(state.screen!=='detail') return;
    if(window.history&&window.history.back) window.history.back();
    else zzGoUp();
  }

  /* ===== TOAST ===== */
  var toastEl=null,toastT=null;
  function showToast(text){if(!toastEl){toastEl=mkEl('div','position:fixed;bottom:80px;left:50%;transform:translateX(-50%);background:rgba(13,20,36,0.92);border:1px solid rgba(0,240,255,0.25);padding:8px 16px;border-radius:8px;font-size:13px;color:'+CY+';box-shadow:0 0 12px rgba(0,240,255,0.18);z-index:200;opacity:0;transition:opacity .2s;pointer-events:none;white-space:nowrap;');document.body.appendChild(toastEl);}toastEl.textContent=text;toastEl.style.opacity='1';clearTimeout(toastT);toastT=setTimeout(function(){toastEl.style.opacity='0';},1700);}

  /* ===== NODE INFO INJECTION (wc/rating/tip) ===== */
  var lastNodeInfoKey='';
  function tagSheetElement(){
    var sheetEl=document.querySelector('.zz-sheet');
    if(sheetEl)return sheetEl;
    var allDivs=document.querySelectorAll('div');
    for(var di=0;di<allDivs.length;di++){
      var d=allDivs[di];
      var ft=(d.textContent||'');
      if(ft.indexOf('离线可用')>=0&&ft.indexOf('在线地图导航')>=0&&ft.length<80){
        d.classList.add('zz-sheet');
        return d;
      }
    }
    return null;
  }
  function injectNodeInfo(){
    if(state.screen!=='detail'||!compInst)return;
    var s=compInst.state;
    if(!s||!s.sheetOpen||!s.sheet){
      var oldNI=document.querySelectorAll('.zz-node-info');
      for(var oi=0;oi<oldNI.length;oi++){oldNI[oi].remove();}
      lastNodeInfoKey='';
      return;
    }
    var sheet=s.sheet;
    var key=(sheet.title||'')+'_'+(sheet.t||'');
    if(key===lastNodeInfoKey)return;
    var allOld=document.querySelectorAll('.zz-node-info');
    for(var oi2=0;oi2<allOld.length;oi2++){if(allOld[oi2].parentNode){allOld[oi2].parentNode.removeChild(allOld[oi2]);}}
    lastNodeInfoKey=key;
    var sheetEl=tagSheetElement();
    if(!sheetEl)return;
    var wc=sheet.wc||'';var rating=sheet.rating||'';var tip=sheet.tip||'';
    if(!wc&&!rating&&!tip)return;
    var infoBox=mkEl('div','margin-top:10px;padding:0;');
    infoBox.className='zz-node-info';
    if(rating){var stars='';var r=parseFloat(rating)||0;for(var si=0;si<5;si++){stars+=si<Math.round(r)?'★':'☆';}infoBox.appendChild(mkEl('div','display:flex;align-items:center;gap:6px;margin-bottom:6px;','<span style="font:700 13px Share Tech Mono,monospace;color:#FF2E88">'+stars+'</span><span style="font:11px Noto Sans SC,system-ui;color:#9FB6C9">'+rating+' / 5.0</span>'));}
    if(wc){infoBox.appendChild(mkEl('div','display:flex;align-items:center;gap:6px;margin-bottom:6px;','<span style="font:700 10px Share Tech Mono,monospace;color:#00F0FF">WC</span><span style="font:12px Noto Sans SC,system-ui;color:#D8E6F0">'+wc+'</span>'));}
    if(tip){infoBox.appendChild(mkEl('div','font:12px/1.55 Noto Sans SC,system-ui;color:#D8E6F0;background:rgba(255,46,136,.06);border:1px solid rgba(255,46,136,.2);border-radius:3px;padding:8px 10px;margin-top:4px','<span style="font:700 10px Share Tech Mono,monospace;color:#FF2E88;margin-right:6px">TIP</span>'+tip));}
    var footer=null;var allE=sheetEl.querySelectorAll('div');
    for(var fi=allE.length-1;fi>=0;fi--){
      var ft=(allE[fi].textContent||'');
      if(ft.indexOf('离线可用')>=0&&ft.length<80){footer=allE[fi];break;}
    }
    if(!footer){lastNodeInfoKey='';return;}
    footer.parentElement.insertBefore(infoBox,footer);
  }

/* ===== VIEW TRACKING ===== */
  function trackViews(){setInterval(function(){patchTitleBar();injectReservationButton();injectBackButton();injectNodeInfo();if(state.screen!=='detail'||!compInst)return;var cv=compInst.state.view;if(cv!==state.tripView&&cv){state.tripView=cv;saveState();}},500);}

  /* ===== BACK BUTTON ===== */
  function handleBackButton(){
    if(!window.__zzPopBound){
      window.__zzPopBound=true;
      window.addEventListener('popstate',function(e){
        if(state.screen!=='detail')return;   // at the trip list -> let the app exit
        var r=zzGoUp();
        /* Keep exactly one sentinel while still inside a trip so the next system
           back also delivers a popstate. On reaching the trip list, do NOT
           re-push: the next back pops the base entry and exits the app. */
        if(r==='stay'){
          if(window.history&&window.history.pushState)window.history.pushState({zz:1},'','');
        }
      });
    }
  }

  /* ===== ZOUZHE LOGO AS BACK BUTTON ===== */
  function injectBackButton(){
    if(state.screen!=='detail')return;
    var walker=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT,null,false);
    var node;
    while(node=walker.nextNode()){
      var t=node.textContent||'';
      if(t.indexOf('走着')>=0&&t.trim().length<=4){
        var logoEl=node.parentElement;
        if(logoEl&&!logoEl.__zzBackBound){
          logoEl.__zzBackBound=true;
          logoEl.style.cursor='pointer';
          logoEl.addEventListener('click',function(e){
            e.stopPropagation();
            if(state.screen!=='detail')return;
            /* Jump straight to the trip list from any depth, then consume the one
               sentinel so history returns to the base (next back exits the app). */
            var mapOv=document.querySelector('.zz-ov.on');if(mapOv)mapOv.classList.remove('on');
            if(compInst&&compInst.state&&compInst.state.sheetOpen){try{compInst.setP({sheetOpen:false});}catch(err){}}
            exitToList();
            if(window.history&&window.history.back)window.history.back();
            showToast('返回行程列表');
          });
        }
        return;
      }
    }
  }

  /* ===== RESERVATION DATA ===== */
  var RESERVATION_DATA={
    'Dill Restaurant':{type:'online',url:'https://noona.app/dill',email:'dillrestaurant@dillrestaurant.is',note:'Noona在线预定 \u00b7 米其林一星 \u00b7 需提前1月',tz:'UTC+0'},
    'Rub 23':{type:'online',url:'https://www.dineout.is/is/rub23',tel:'+3544622223',note:'DineOut在线预定',tz:'UTC+0'},
    '\u5c9a\u5c71\u5409\u5146':{type:'online',url:'https://www.tablecheck.com/en/shops/kikunoi',tel:'+81755610015',note:'TableCheck在线预定 \u00b7 米其林三星',tz:'UTC+9'},
    'Da Felice':{type:'online',url:'https://feliceatestaccio.com',tel:'+39065746800',note:'\u5b98\u7f51\u9884\u5b9a \u00b7 \u9700\u63d0\u524d\u6570\u5468',tz:'UTC+1'},
    'Il Latini':{type:'phone',tel:'+39055210916',note:'\u9700\u7535\u8bdd\u9884\u5b9a \u00b7 \u65e0\u83dc\u5355\u6258\u65af\u5361\u7eb3\u5957\u9910',tz:'UTC+1'},
    'RIONE XIV':{type:'phone',tel:'+390645682897',note:'\u7535\u8bdd\u9884\u5b9a \u00b7 19:00\u9996\u8f6e',tz:'UTC+1'},
    'Settimio':{type:'phone',tel:'+39066868936',note:'\u7535\u8bdd\u9884\u5b9a \u00b7 \u963f\u5170\u4e54\u8857',tz:'UTC+1'},
    'Parrucchiano':{type:'phone',tel:'+390818784020',note:'\u7535\u8bdd\u9884\u5b9a \u00b7 150\u5e74\u67e0\u6aac\u56ed\u82b1\u623f\u8001\u5e97',tz:'UTC+1'},
    'Da Emilia':{type:'phone',tel:'+390818072720',note:'\u7535\u8bdd\u9884\u5b9a \u00b7 \u8ba2\u6c34\u8fb9\u4f4d',tz:'UTC+1'},
    'Da Paolino':{type:'phone',tel:'+390818376102',note:'\u7535\u8bdd\u9884\u5b9a \u00b7 \u67e0\u6aac\u6811\u7a79\u9876\u540d\u5e97',tz:'UTC+1'},
    "Buca dell'Orafo":{type:'address',addr:'Ponte Vecchio, Firenze',note:'\u8001\u6865\u6865\u5934\u5730\u7a91\u5e97 \u00b7 \u9700\u7535\u8bdd\u786e\u8ba4',tz:'UTC+1'},
    'El Brellin':{type:'address',addr:'Vicolo dei Lavandai 14, Milano',note:'\u8fd0\u6cb3\u666f\u89c2\u4f4d \u00b7 \u9700\u7535\u8bdd\u786e\u8ba4',tz:'UTC+1'},
    '\u65c5\u9986\u4f1a\u5e2d\u6599\u7406':{type:'included',note:'\u542b\u6e29\u6cc9\u65c5\u9986\u4e00\u6cca\u4e8c\u98df'},
    'Hotel Skogafoss':{type:'included',tel:'+3544878780',note:'\u542b\u4f4f\u5bbf\u665a\u9910'},
    'Hali':{type:'included',tel:'+3544789070',note:'\u542b\u4f4f\u5bbf\u9f81\u8693\u6c64'},
    '\u9ec4\u91d1\u8857\u5c45\u9152\u5c4b':{type:'walkin',note:'\u968f\u5230\u968f\u5403'},
    '\u516d\u6b4c\u706f\u70e7\u9e1f':{type:'walkin',note:'\u968f\u5230\u968f\u5403'},
    '\u7ae0\u9c7c\u70e7':{type:'walkin',note:'\u968f\u610f\u901b\u8857\u5403'},
    'cicchetti':{type:'walkin',note:'\u9152\u9986\u5de1\u6e38 \u00b7 \u968f\u5230\u968f\u5403'},
    '\u8f66\u7ad9\u7b80\u9910':{type:'walkin',note:'\u7ad9\u5185\u7b80\u9910'},
    '\u9152\u5e97\u9644\u8fd1\u968f\u610f':{type:'walkin',note:'\u4e0d\u5b89\u6392\u6b63\u9910'},
    'Inn Bufalito':{type:'walkin',note:'\u968f\u5230\u968f\u5403'},
  };
  var RSK='zouzhe_reservation_v1';
  function getResStatus(name){try{var d=JSON.parse(localStorage.getItem(RSK)||'{}');return !!d[name];}catch(e){return false;}}
  function setResStatus(name,val){try{var d=JSON.parse(localStorage.getItem(RSK)||'{}');d[name]=val;localStorage.setItem(RSK,JSON.stringify(d));}catch(e){}}
  function lookupReservation(dinnerName){
    for(var key in RESERVATION_DATA){
      if(dinnerName.indexOf(key)>=0)return RESERVATION_DATA[key];
    }
    return null;
  }
  function convertToBeijingTime(localTime,fromTZ){
    if(!localTime)return'';
    var offsetMap={'UTC+0':8,'UTC+1':7,'UTC+9':-1};
    var off=offsetMap[fromTZ]||0;
    var m=localTime.match(/(\d{1,2})[:\uff1a](\d{2})/);
    if(!m)return localTime;
    var h=(parseInt(m[1])+off+24)%24;
    var min=m[2];
    return h+':'+min;
  }
  function handleReservation(resInfo,dinnerName){
    if(!resInfo)return;
    if(resInfo.type==='online'&&resInfo.url){
      window.open(resInfo.url,'_blank');
      showToast('\u6253\u5f00\u9884\u5b9a\u5e73\u53f0: '+resInfo.url);
    }else if(resInfo.type==='phone'&&resInfo.tel){
      var tel='tel:'+resInfo.tel.replace(/[^+0-9]/g,'');
      var bt=resInfo.tz?convertToBeijingTime((dinnerName.match(/\d{1,2}[:\uff1a]\d{2}/)||[])[0]||'',resInfo.tz):'';
      showToast(resInfo.note+(bt?' \u00b7 \u5317\u4eac\u65f6\u95f4'+bt:''));
      setTimeout(function(){window.location.href=tel;},800);
    }else if(resInfo.type==='address'){
      var q=encodeURIComponent(resInfo.addr||dinnerName);
      window.open('https://www.google.com/maps/search/?api=1&query='+q,'_blank');
      showToast(resInfo.note);
    }else if(resInfo.type==='included'){
      showToast('\u5df2\u542b\u4f4f\u5bbf: '+(resInfo.note||''));
    }else if(resInfo.type==='walkin'){
      showToast('\u65e0\u9700\u9884\u5b9a: '+(resInfo.note||''));
    }
  }
  var lastDinnerName=null;
  function injectReservationButton(){
    if(state.screen!=='detail'||!compInst)return;
    var cv=compInst.state.view;
    if(cv!=='today')return;
    var nameEl=document.querySelector('div[style*="13.5px"]');
    if(!nameEl)return;
    var dinnerName=nameEl.textContent.trim();
    if(!dinnerName||dinnerName.length<2)return;
    if(dinnerName===lastDinnerName)return;
    lastDinnerName=dinnerName;
    var resInfo=lookupReservation(dinnerName);
    if(!resInfo)return;
    var card=nameEl;
    while(card&&card!==document.body){
      if(card.querySelector('.zz-reserve-btn'))return;
      if(card.querySelector('button'))break;
      card=card.parentElement;
    }
    if(!card||card===document.body)return;
    var btnRow=null;
    var flexEls=card.querySelectorAll('div[style*="flex"]');
    for(var fi=0;fi<flexEls.length;fi++){
      if(flexEls[fi].querySelector('button')){
        btnRow=flexEls[fi];
        break;
      }
    }
    if(!btnRow){
      var copyBtn=card.querySelector('button');
      if(copyBtn&&copyBtn.parentElement)btnRow=copyBtn.parentElement;
    }
    if(!btnRow)return;
        var isBooked=getResStatus(dinnerName);
        var btnLabel=isBooked?'✓ 已预定':'预定';
        var btnColor=isBooked?'#2EE86C':(resInfo.type==='online'?'#FF2E88':(resInfo.type==='phone'?'#00F0FF':'#9FB6C9'));
        var btnBorder=isBooked?'rgba(46,232,108,.4)':(resInfo.type==='online'?'rgba(255,46,136,.4)':'rgba(0,240,255,.35)');
        var btnBg=isBooked?'rgba(46,232,108,.07)':(resInfo.type==='online'?'rgba(255,46,136,.07)':'rgba(0,240,255,.07)');
        var reserveBtn=mkEl('button',null,btnLabel);
        reserveBtn.className='zz-reserve-btn';
        reserveBtn.setAttribute('style','flex:none;font:600 12px Noto Sans SC,system-ui;border:1px solid '+btnBorder+';background:'+btnBg+';color:'+btnColor+';border-radius:3px;padding:8px 13px;cursor:pointer;min-height:36px;margin-left:6px;');
        reserveBtn.addEventListener('click',function(e){
          e.stopPropagation();
          if(resInfo.type==='walkin'){
            handleReservation(resInfo,dinnerName);
          }else if(resInfo.type==='included'){
            handleReservation(resInfo,dinnerName);
          }else{
            if(getResStatus(dinnerName)){
              setResStatus(dinnerName,false);
              reserveBtn.textContent='预定';
              reserveBtn.style.color='#00F0FF';
              reserveBtn.style.borderColor='rgba(0,240,255,.35)';
              reserveBtn.style.background='rgba(0,240,255,.07)';
              showToast('取消预定标记');
            }else{
              handleReservation(resInfo,dinnerName);
              setResStatus(dinnerName,true);
              reserveBtn.textContent='✓ 已预定';
              reserveBtn.style.color='#2EE86C';
              reserveBtn.style.borderColor='rgba(46,232,108,.4)';
              reserveBtn.style.background='rgba(46,232,108,.07)';
            }
          }
        });
        btnRow.appendChild(reserveBtn);
  }

  /* ===== INIT ===== */
  function init(){window.__mt_init=true;loadState();
    try{var th=localStorage.getItem('zz_theme');if(th==='light')document.documentElement.classList.add('zz-light');}catch(e){}
    buildTripList();
    buildInd();
    document.addEventListener('touchstart',tsStart,{passive:true});
    document.addEventListener('touchmove',tsMove,{passive:true});
    document.addEventListener('touchend',tsEnd,{passive:true});
    trackViews();
    handleBackButton();
    // Always poll for component instance (needed for trip switching)
    var ia=0;
    var fi=function(){
      compInst=findCompInst();window.__ZZ_COMP=compInst;
      if(compInst){
        if(state.screen==='detail'&&state.tripId){
          showDetail();
          switchToTrip(state.tripId);
          compInst.setP({view:state.tripView||'overview',sheetOpen:false});
          if(window.history&&window.history.pushState)window.history.pushState({zz:1},'','');
        }else{
          showList();
        }
      }else if(ia<60){
        ia++;
        setTimeout(fi,100);
      }else{
        showList();
      }
    };
    setTimeout(fi,200);
  }

  var done=false;
  function tryInit(){
    if(done) return;
    var r=document.getElementById('dc-root')||document.getElementById('root')||document.querySelector('[data-dc-root]')||document.querySelector('x-dc');
    if(r&&r.children.length>0){
      done=true;
      // Try to override Component prototype
      var attempts=0;
      var tryOverride=function(){
        if(overrideComponent()){
          init();
        }else if(attempts<30){
          attempts++;
          setTimeout(tryOverride,100);
        }else{
          // Fallback: init without overrides (italy only)
          init();
        }
      };
      tryOverride();
    }
  }

  tryInit();
  var n=0;
  var ti=setInterval(function(){tryInit();if(++n>20)clearInterval(ti);},200);
})();
