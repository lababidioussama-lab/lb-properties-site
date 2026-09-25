import type { Dictionary } from "./types";

/**
 * Simplified Chinese.
 *
 * Machine-authored, not native-reviewed. Structure and figures are safe, but
 * the four legal blocks (roi.disclaimer, projects.disclaimer,
 * netRoi.disclaimer, footer.disclaimer) carry regulatory weight and should
 * be read by a native speaker before this locale is promoted.
 *
 * The [[double brackets]] mark the accent phrase. Chinese has no italic, so
 * globals.css renders these upright and bold rather than slanted — a
 * synthesised oblique on Han glyphs reads as a rendering fault.
 */
export const zh: Dictionary = {
  meta: {
    title: "Lababidi Properties — 迪拜房产顾问、期房与投资",
    description:
      "迪拜高端资产的全流程管理：楼花开发商房源、黄金签证顾问、搬迁管家服务、室内设计与别墅建造。",
  },

  nav: {
    advisory: "投资顾问",
    advisoryDesc: "楼花房源、回报分析、黄金签证",
    netRoi: "净回报与物业费",
    netRoiDesc: "扣除 DLD、中介费与 Mollak 后的二手市场收益",
    relocation: "搬迁与公共事业",
    relocationDesc: "搬家、DEWA 开通、远程交房",
    maintenance: "家居维护",
    maintenanceDesc: "空调、水管、年度养护套餐",
    fitout: "室内精装",
    fitoutDesc: "3D 软装方案、定制木作",
    construction: "建造与翻新",
    constructionDesc: "别墅扩建、泳池、DLD 与市政许可",
    mortgage: "按揭顾问",
    mortgageDesc: "贷款成数上限、还款能力，以及您实际需要的现金",
    mortgageShort: "按揭",
    openMenu: "打开菜单",
    closeMenu: "关闭菜单",
    menu: "菜单",

    advisoryShort: "投资顾问",
    netRoiShort: "净回报",
    fitoutShort: "精装",
    constructionShort: "建造",
    relocationShort: "搬迁",
    maintenanceShort: "维护",

    home: "首页",
    projects: "项目",
    projectsDesc: "迪拜知名开发商的期房配额",
    investors: "投资者",
    investorsDesc: "收益、净回报、按揭与市场数据工具",
    services: "服务",
    servicesDesc: "搬迁、装修与建造",
    contact: "联系我们",
    contactDesc: "预约私人咨询",
  },

  utility: {
    currency: "货币",
    language: "语言",
    theme: "主题",
    themeToDark: "切换到深色",
    themeToLight: "切换到浅色",
    concierge: "WhatsApp 联系我们",
    conciergeShort: "WhatsApp",
    live: "顾问在线",
    callAdvisor: "致电顾问",
    whatsappUs: "WhatsApp 联系我们",
    calcNetRoi: "计算净回报",
    directConcierge: "WhatsApp 专属管家",
  },

  hero: {
    eyebrow: "迪拜 · 私人客户事务所",
    title: "迪拜房产顾问、定制室内设计与[[别墅建造]]",
    subtitle:
      "高端资产的全流程管理：楼花开发商房源、黄金签证、精装修与别墅年度养护 — 全部在一处完成。",
    tabsLabel: "从哪里开始",
    tabs: {
      advisory: "楼花投资顾问",
      netRoi: "净回报与物业费工具",
      fitout: "精装与翻新",
      relocation: "搬迁与入住",
      maintenance: "年度维护",
    },
    cta: {
      advisory: "查看在售房源",
      netRoi: "获取净回报报告",
      fitout: "获取精装报价",
      relocation: "规划我的搬迁",
      maintenance: "预约别墅检查",
      construction: "洽谈我的项目",
      mortgage: "测算我的贷款额度",
    },
    secondaryCta: "咨询顾问",
    scrollHint: "继续浏览",
    stats: {
      licensed: "监管资质",
      licensedValue: "DET 持牌经纪公司",
      languages: "服务语言",
      languagesValue: "AR · EN · RU · 中文",
      response: "我们的回复时间",
      responseValue: "1 小时内",
    },
  },

  roi: {
    eyebrow: "投资顾问",
    title: "先算清回报，再由我们[[找到房源]]",
    subtitle:
      "设定预算与目标。我们会给出参考回报结构与匹配的区域，然后为您带来并未公开发售的楼花配额。",
    budgetLabel: "投资预算",
    budgetHint: "拖动设置预算",
    goalLabel: "首要目标",
    goals: {
      yield: "高租金回报",
      yieldDesc: "以收益优先，毛回报 6–9%",
      appreciation: "资产增值",
      appreciationDesc: "以增值优先，持有期更长",
      goldenVisa: "十年黄金签证",
      goldenVisaDesc: "200 万迪拉姆起可申请居留",
    },
    results: {
      title: "参考回报结构",
      grossYield: "毛回报率",
      netYield: "净回报率",
      netAnnual: "预计年度净租金收入",
      netMonthly: "每月",
      appreciation: "年增值率",
      fiveYear: "五年后参考价值",
      perYear: "每年",
    },
    visa: {
      eligibleTitle: "符合阿联酋十年居留资格",
      eligibleBody: "您的预算已超过黄金签证 200 万迪拉姆的房产门槛。",
      shortfallTitle: "低于十年黄金签证门槛",
      shortfallBody: "距离 200 万迪拉姆的房产要求还差 {amount}。",
      investorTitle: "符合两年投资者签证资格",
      investorBody: "75 万迪拉姆起的房产投资可申请可续签的投资者签证。",
      noneTitle: "低于投资者签证门槛",
      noneBody: "与房产挂钩的居留资格自 75 万迪拉姆起。",
      aedNote: "法定门槛，以迪拉姆计",
    },
    hubsTitle: "推荐投资区域",
    hubYield: "回报",
    hubGrowth: "增值",
    hubEntry: "起价",
    cta: "索取专属楼花房源与免税分析",
    ctaHint: "以 PDF 交付，或直接发送至您的 WhatsApp",
    disclaimer:
      "所列数字为仅供说明的参考市场区间，基于各社区典型的毛回报率、物业费与管理成本，并非估值、预测或个性化财务建议。实际回报因楼栋、单元、楼层与租约条款而异。我们并非持牌财务顾问 — 投资前请咨询具备资质的专业人士。",
  },

  process: {
    eyebrow: "流程如何运作",
    title: "从第一通电话到[[房产证]]",
    subtitle: "专为尚未抵达迪拜的买家设计的远程流程，每一步都可在异地完成。",
    steps: {
      discovery: {
        title: "初步沟通",
        desc: "就预算、时间安排与居留目标进行保密沟通 — 没有压力，也没有照本宣科的推销。",
      },
      shortlist: {
        title: "精选清单",
        desc: "我们只带回真正符合需求的少量配额，而不是开发商的整本目录。",
      },
      reservation: {
        title: "预订与文件",
        desc: "以电汇方式预订。若您无法到场签署，我们可凭授权书代为办理。",
      },
      handover: {
        title: "产权与交房",
        desc: "在 DLD 登记至您名下的产权、单元验收报告，以及钥匙 — 或已等候的租客。",
      },
    },
    cta: "开始我的购置流程",
  },

  opportunities: {
    eyebrow: "参考机会",
    title: "当前[[市场概况]]",
    subtitle:
      "这是社区层面的价格与可实现租金，而非某个待售单元 — 明确需求后，我们会带来真正的楼花配额。",
    from: "起价",
    grossYield: "毛回报率",
    badges: {
      goldenVisa: "符合黄金签证",
      highYield: "高回报",
      villa: "别墅",
      waterfront: "临水",
    },
    cta: "获取实时精选清单",
    disclaimer:
      "价格与回报率为社区平均参考值，并非特定单元的销售信息 — 详见上方回报计算器下的免责声明。黄金签证资格以所示参考价格达到 200 万迪拉姆房产门槛为前提。",
  },

  testimonials: {
    /* 示例文案 — 并非真实客户。参见 en.ts 中的说明。 */
    eyebrow: "客户评价",
    title: "通过我们[[买房是什么体验]]",
    subtitle: "购置、融资与交房——来自全程在阿联酋境外完成流程的客户。",
    items: {
      one: {
        quote:
          "我在从未踏足迪拜的情况下买下了滨海区的一套两居室。他们测算的净收益率与该单元的实际回报相差不到零点几个百分点，报出的物业费也正是 Mollak 账单上的数字，而不是估算。",
        attribution: "出租型投资者 · 于伦敦远程购入",
      },
      two: {
        quote:
          "我在意的是如实告知各项费用到底要花多少。土地局费用加中介佣金在首付之外接近房价的 8%，在要求我签约之前，没有人把这一点写下来给我看过。",
        attribution: "首次置业者 · Jumeirah Village Circle",
      },
      three: {
        quote:
          "交房、验收整改清单和装修都在同一条线上推进。整个过程我人都在莫斯科，凭授权书签的字。",
        attribution: "别墅业主 · Dubai Hills Estate",
      },
    },
  },

  resources: {
    eyebrow: "投资者资料",
    title: "通话[[之前]]先做功课",
    subtitle: "索取符合您需求的指南 — 由资深顾问通过 WhatsApp 发送。",
    items: {
      investmentGuide: {
        title: "迪拜投资指南",
        desc: "回报最佳的社区、税务处理、楼花与现房对比、退出策略。",
      },
      goldenVisaGuide: {
        title: "黄金签证指南",
        desc: "一套 200 万迪拉姆的房产如何换取阿联酋十年居留。",
      },
      yieldReport: {
        title: "租金回报最高的社区",
        desc: "按我们覆盖社区的参考净回报率排名。",
      },
    },
    cta: "通过 WhatsApp 索取",
  },

  credentials: {
    rera: "RERA 注册",
    dld: "DLD 注册经纪",
    det: "DET 度假公寓运营方",
    contractors: "持牌承包商",
    reraValue: "ORN 00000",
    dldValue: "BRN 00000",
    detValue: "许可证 00000",
    contractorsValue: "迪拜市政局",
  },

  trust: {
    rank: "经纪排名待定",
    investors: "已服务 0 位投资者",
    investorsNote: "业绩记录整理中",
    rating: "暂无公开评价",
  },

  agent: {
    launcher: "咨询管家",
    title: "管家助理",
    subtitle: "即时答复 · 顾问一小时内跟进",
    greeting:
      "您好，我可以解答关于楼花项目、黄金签证资格、精装修与建造的问题。您想了解什么？",
    prompts: [
      "哪些项目适合申请黄金签证？",
      "你们可以做别墅翻新吗？",
      "净回报工具能看到什么？",
    ],
    placeholder: "咨询项目或服务",
    send: "发送",
    thinking: "查询中",
    error: "消息未能发送。请通过下方 WhatsApp 联系资深顾问，一小时内会有答复。",
    humanHandoff: "与真人顾问沟通",
    waMessage: "您好，我在贵网站使用了助理功能，希望与顾问沟通。",
  },

  projects: {
    eyebrow: "楼花配额",
    title: "我们[[确实能为您拿到]]的项目",
    subtitle:
      "我们持有资料并拥有配额渠道的在售开发商房源。这不是房源门户 — 每一个项目，资深顾问今天就能展开洽谈。",
    allDevelopers: "全部开发商",
    minutesTo: "分钟至",
    priceLabel: "起价",
    planLabel: "付款计划",
    onRequest: "详询",
    cta: "咨询此项目",
    viewDetail: "查看项目",
    swipeHint: "滑动查看更多项目",
    unitMixLabel: "户型配置",
    connectivityLabel: "交通便利",
    highlightsLabel: "项目亮点",
    disclaimer:
      "项目信息摘录自开发商官方资料。价格、付款计划与交房日期仅在开发商明确说明时显示，并在任何预订前与开发商现行价目表核对。效果图由开发商提供，仅供参考。本页内容不构成要约或估值。",
  },

  whyDubai: {
    eyebrow: "为什么选择迪拜",
    title: "让资本[[流向这里]]的算术",
    subtitle: "住宅毛回报率与租金收入的税务处理，与国际买家通常拿来与迪拜比较的城市对照。",
    city: "城市",
    yield: "典型毛回报率",
    tax: "租金收入税",
    ownership: "外籍永久产权",
    cities: {
      dubai: "迪拜",
      london: "伦敦",
      newYork: "纽约",
      singapore: "新加坡",
      hongKong: "香港",
    },
    yes: "可以",
    limited: "受限",
    note: "回报率为全市住宅参考区间，各区域与资产之间差异很大。税务处理为简化说明，取决于您的税务居民身份与持有架构 — 请另行取得独立税务建议。",
  },

  netRoi: {
    eyebrow: "二手市场测算",
    title: "扣除[[没人告诉您的费用]]之后的回报",
    subtitle:
      "二手购置在过户前约有 6–7% 的取得成本，此后每年还有 Mollak 物业费。本工具以您实际支出为分母，而不是挂牌价。",

    modeLabel: "出租策略",
    modes: {
      longTerm: "长期出租",
      longTermDesc: "年度租约，Ejari 登记",
      shortTerm: "度假公寓",
      shortTermDesc: "按晚短租，DET 持牌",
    },

    inputs: {
      area: "社区",
      bedroom: "户型面积",
      price: "购买价格",
      sqft: "室内面积",
      sqftUnit: "平方英尺",
      rent: "可实现年租金",
      adr: "平均每晚房价",
      occupancy: "入住率",
    },

    outlay: {
      title: "资金总投入",
      price: "购买价格",
      dld: "DLD 过户费（4%）",
      dldAdmin: "DLD 手续费",
      agency: "中介佣金（约2%）",
      registration: "受托登记费",
      titleDeed: "房产证签发",
      totalFees: "取得成本",
      total: "投入合计",
      pctNote: "在挂牌价之外另加 {pct}%",
    },

    income: {
      title: "年度收支",
      gross: "年度总收入",
      serviceCharge: "物业费",
      management: "管理与平台费用",
      utilities: "水电冷气",
      other: "清洁、DET 与耗材",
      net: "年度净收入",
    },

    results: {
      grossOnPrice: "以价格计的毛回报率",
      grossOnPriceNote: "通常被拿来宣传的数字",
      netOnOutlay: "以总投入计的净回报率",
      netOnOutlayNote: "您实际赚到的",
      gap: "差额",
      gapNote: "个百分点消耗在费用与开支上",
      payback: "本金回收期",
      years: "年",
    },

    mollak: {
      title: "RERA Mollak 物业费查询",
      subtitle: "物业费按楼栋核定并在 Mollak 系统公示。以下为各社区当前参考区间。",
      perSqft: "迪拉姆 / 平方英尺 / 年",
      annualTotal: "预估年度物业费",
      forArea: "{area} 内 {sqft} 平方英尺",
      bandNote: "社区区间：{low}–{high} 迪拉姆 / 平方英尺",
      caution:
        "具有约束力的是您所在具体楼栋的 Mollak 账单。我们会在您做决定前调取真实的账单记录。",
    },

    cta: "下载专属楼花说明书",
    ctaHint: "您精选清单的完整净回报测算，以 PDF 或 WhatsApp 交付",

    disclaimer:
      "计算采用社区平均参考值与迪拜标准交易成本，是方法的示例而非估值或预测，且不含按揭成本、空置期与资本性支出。物业费、DLD 费用与租金水平会变动。购买前请取得独立的专业意见。",
  },

  relocation: {
    eyebrow: "搬迁与公共事业",
    title: "抵达迪拜时[[一切已经开通]]",
    subtitle:
      "入住当天应该只有钥匙和一个能用的家。搬运、文件与政府门户由我们处理 — 包括仍在海外的业主。",
    cards: {
      move: {
        title: "VIP 搬家与墙面修复",
        desc: "白手套式同城搬迁，含全套打包、退租墙面修复，并在您开箱前完成深度消毒。",
        items: [
          "全套打包、包裹与木箱加固",
          "家具拆卸与复装",
          "退租重新粉刷与墙面修复",
          "深度消毒与交房清洁",
        ],
      },
      utilities: {
        title: "公共事业与政府登记",
        desc: "所有账户、门户与合同在您抵达前以您的名义办妥，第一天不会有任何待办。",
        items: [
          "DEWA 水电开通",
          "Empower / Emicool 区域供冷",
          "Ejari 租赁合同登记",
          "网络、冷气与社区门禁卡",
        ],
      },
      handover: {
        title: "远程交房与验房",
        desc: "我们亲自到场接收，完整验收单元并在您签署任何文件前把报告发给您。",
        items: [
          "陪同开发商领取钥匙",
          "附照片的完整验房报告",
          "缺陷跟进直至全部闭环",
          "钥匙安全保管与快递",
        ],
        tag: "适合海外业主",
      },
    },
    cta: "索取搬迁报价",
  },

  maintenance: {
    eyebrow: "房产养护俱乐部",
    title: "这是[[会员制]]，不是维修合同",
    subtitle:
      "按计划进行的养护，由熟悉您房产的主管负责 — 所以您第一次听说冷机故障，是在收到「已经更换」的通知时。",
    billing: {
      monthly: "按月付费",
      annual: "年度方案",
      save: "节省 15%",
      perMonth: "每月",
      perYear: "每年",
      billedAnnually: "按年结算",
    },
    popular: "最多人选择",
    memberSince: "会员资格",
    plans: {
      standard: {
        name: "基础住宅",
        for: "公寓与联排别墅",
        desc: "针对单套住宅的计划性预防养护。",
      },
      premium: {
        name: "VIP 别墅套餐",
        for: "六卧以内别墅",
        desc: "更深入的空调保养，另加全天候紧急支援。",
      },
      ultra: {
        name: "私人庄园",
        for: "庄园、泳池与园区",
        desc: "专属主管，以及园区、泳池与空气质量的完整养护方案。",
      },
    },
    features: {
      acFilter: "空调滤网消毒",
      acCoil: "空调盘管深度清洗",
      ductCleaning: "全屋风管清洁",
      plumbing: "水管检查",
      electrical: "电气安全检查",
      visits: "计划上门次数",
      emergency: "7×24 紧急出勤",
      pest: "虫害防治方案",
      pool: "泳池水质平衡",
      landscaping: "园艺与场地养护",
      supervisor: "专属庄园主管",
      response: "响应时间",
    },
    values: {
      quarterly: "每季度",
      biMonthly: "每两个月",
      monthly: "每月",
      twiceYear: "每年两次",
      annual: "每年",
      weekly: "每周",
      hours48: "48 小时",
      hours8: "8 小时",
      hours2: "2 小时",
      included: "包含",
      notIncluded: "不包含",
    },
    cta: "选择方案并预约检查",
    ctaAll: "预约技师即时上门检查",
  },

  fitout: {
    eyebrow: "室内设计与精装",
    title: "同一个空间，[[真正被认真对待]]",
    subtitle:
      "拖动滑块。左侧是开发商标准交房，右侧是完整的建筑级精装对同一空间的改变。",
    before: "开发商交房",
    after: "精装之后",
    dragHint: "拖动对比",
    packages: {
      investor: {
        title: "投资者交钥匙套餐",
        for: "开间与一居",
        desc: "面向短租的完整软装配置，三周内完成安装与拍摄。",
        items: [
          "全套家具、软装与灯光配置",
          "厨具、布草与宾客用品",
          "专业房源摄影",
          "21 天内安装完毕并可出租",
        ],
      },
      villa: {
        title: "豪华别墅定制木作",
        for: "别墅与顶层复式",
        desc: "依墙体量身绘制的木作：步入式衣帽间、厨房与集成智能照明。",
        items: [
          "定制步入式衣帽间与更衣室",
          "厨房改造与石材台面",
          "全屋智能照明与自动化",
          "大理石、饰面板与特殊工艺",
        ],
      },
    },
    materials: {
      title: "材料搭配",
      subtitle: "选择一个方向，空间随之改变饰面。每套配色均由我们指定、采购并施工。",
      marble: {
        name: "意大利大理石",
        desc: "Calacatta 与 Statuario，地面与台盆对花铺贴。",
      },
      oak: {
        name: "烟熏橡木",
        desc: "熏制欧洲橡木，宽板地面与格栅墙板。",
      },
      microcement: {
        name: "微水泥",
        desc: "无缝抹面，没有砖缝，温润的矿物灰。",
      },
      brass: {
        name: "拉丝黄铜",
        desc: "未上漆黄铜收边、阴影缝与嵌入式木作拉手。",
      },
    },

    upload: {
      cta: "上传户型图获取 3D 概念方案与报价",
      hint: "PDF、JPG 或 PNG · 不超过 10 MB",
    },
  },

  construction: {
    eyebrow: "建造与翻新",
    title: "建得扎实，[[并且合法报建]]",
    subtitle:
      "扩建、泳池与别墅整体翻新以单一合同交付 — 动工之前，所有审批均已以您的名义取得。",
    capabilities: {
      extensions: {
        title: "别墅扩建与玻璃阳光房",
        desc: "在现有结构轮廓内增建卧室、扩大 majlis，以及结构性玻璃阳光房。",
      },
      pools: {
        title: "游泳池与户外凉亭",
        desc: "开挖泳池、设备房、遮阳结构与完整的景观衔接。",
      },
      permits: {
        title: "政府许可管家服务",
        desc: "迪拜市政局、DLD、Concordia 与开发商 NOC — 准备、提交并跟进到底。",
      },
    },
    stepperTitle: "合法报建的流程",
    steps: {
      design: { title: "设计与图纸", desc: "概念方案、结构图纸与工程量清单" },
      submission: { title: "市政局报批", desc: "迪拜市政局施工许可申请" },
      noc: { title: "DLD 与开发商 NOC", desc: "Emaar、Nakheel 或 Concordia 的许可" },
      build: { title: "施工", desc: "固定范围合同，分阶段验收" },
      handover: { title: "竣工与交付", desc: "最终验收、证书与质保" },
    },
    trustBanner: "全部法律与许可合规事项，由我们代为处理",
    trustSub: "每一项许可均以业主名义、由持牌承包商申请，竣工时证书交予您本人。",
    cta: "洽谈建造项目",
  },

  mortgage: {
    eyebrow: "按揭顾问",
    title: "您能贷多少，以及[[真实成本是多少]]",
    subtitle:
      "迪拜的贷款额度受居留身份以及是否首套房限制 — 而交易成本无法计入贷款。这里把两者一并算清，让您在做决定前就知道实际需要准备多少现金。",
    buyerLabel: "您的身份",
    buyers: {
      resident: "外籍居民",
      residentDesc: "持有阿联酋居留签证",
      national: "阿联酋公民",
      nationalDesc: "监管上限更高",
      nonResident: "非居民",
      nonResidentDesc: "从海外购买",
    },
    statusLabel: "该房产属于",
    statuses: {
      first: "我的首套房",
      firstDesc: "最高贷款成数",
      second: "第二套房",
      secondDesc: "上限大幅下降",
      offPlan: "楼花",
      offPlanDesc: "上限 50%",
    },
    priceLabel: "房产价格",
    rateLabel: "利率",
    termLabel: "贷款年限",
    years: "年",
    incomeLabel: "月收入",
    incomeHint: "选填 — 用于还款能力测算",
    commitmentsLabel: "现有每月负担",
    results: {
      title: "您的贷款状况",
      maxLtv: "最高贷款成数",
      loan: "贷款金额",
      deposit: "所需首付",
      monthly: "每月还款",
      insurance: "人寿与房产保险",
      cashRequired: "需准备的现金总额",
      cashNote: "首付加上所有无法计入贷款的费用",
      totalInterest: "整个贷款期的利息总额",
    },
    fees: {
      title: "无法计入贷款的费用",
      dldTransfer: "DLD 过户费",
      agency: "中介佣金",
      trustee: "受托登记处",
      mortgageRegistration: "按揭登记",
      bankArrangement: "银行安排费",
      valuation: "房产估值",
      total: "前期费用合计",
    },
    affordability: {
      title: "还款能力测算",
      dbr: "债务负担比率",
      dbrNote: "央行将其上限设为收入的 50%",
      passes: "在监管上限之内",
      fails: "超过 50% 上限 — 贷款将被拒绝",
      maxPrice: "您的收入可支撑的价格",
    },
    rateNote: "默认值为三个月 EIBOR 加上典型的银行利差。您的实际利率取决于贷款银行、薪资与固定期限。",
    cta: "为我引荐按揭顾问",
    disclaimer:
      "本页是对央行贷款规则与迪拜标准交易成本的说明，并非按揭要约或信贷决定。贷款成数上限、50% 债务负担比率与 DLD 费用属于监管规定；利率、银行利差与安排费则因贷款机构与申请人而异。我们是注册房地产代理，为客户引荐持牌按揭顾问 — 我们不放贷，也不提供财务建议。",
  },
  market: {
    eyebrow: "市场数据",
    title: "市场的[[登记数据]]",
    subtitle:
      "两张图表与一组公开指数。价格来自迪拜土地局登记的成交记录，收益率由这些价格对照在租房源租金计算得出，涨幅则引自设有正规指数的机构。凡属推算或估算的数字，均已注明。",

    filterLabel: "户型",
    viewChart: "图表",
    viewTable: "表格",

    price: {
      title: "各社区每平方英尺价格",
      subtitle:
        "成交价中位数除以该户型的全市面积中位数。各社区的分母一致，这正是各条色带可以横向比较的原因——但所得比值属推算结果，并非公布的每平方英尺价格。",
      axis: "每平方英尺（迪拉姆）",
      empty: "该户型暂无价格数据。",
    },

    yieldChart: {
      title: "各社区毛收益率",
      subtitle:
        "每条色带覆盖该社区实际在售各户型中最低与最高的毛收益率。同一栋楼里的开间与三居室可能相差两个百分点，单一数字会掩盖这一点。",
      axis: "毛收益率，%",
      benchmark: "全市基准",
      empty: "缺少可匹配的价格与租金数据。",
    },

    growth: {
      title: "涨幅：引用而非自行计算",
      subtitle:
        "这些是成交数据无法得出的数字。对登记成交额取年度中位数会得到离谱的涨幅，因为样本量、户型面积结构与期房占比同时在变。以下数字取自已对此加以校正的指数。",
      nominal: "价格涨幅，名义",
      nominalNote: "REIDIN 房价指数，同比",
      real: "价格涨幅，实际",
      realNote: "已扣除通胀——更实在的一个数字",
      ready: "现房",
      readyNote: "ValuStrat 平均成交价",
      offPlan: "期房",
      offPlanNote: "ValuStrat 平均成交价",
      rents: "租金涨幅",
      rentsNote: "全部住宅——四个月前约为 6.2%",
      villaRents: "别墅租金",
      villaRentsNote: "正在下跌。任何假定租金继续上涨的测算，如今都是错的。",
      perSqft: "迪拉姆 / 平方英尺",
    },

    table: {
      community: "社区",
      perSqft: "迪拉姆 / 平方英尺",
      lowest: "最低",
      highest: "最高",
    },

    notes: {
      title: "数据来源",
      prices:
        "价格为迪拜土地局在 {from} 至 {to} 期间登记成交的中位数，每个计入的单元格至少有 {min} 笔成交。表中 {total} 个价格单元格里，有 {dld} 个来自该次取数，其余为估算值，且表格并未记录具体是哪些。登记数据止于 {to}，因此这是该时期的基准价，而非今日的挂牌价——未作任何上调。",
      rents:
        "租金为 29 个社区在租房源的挂牌中位数，并下调约 4%，因为业主通常低于挂牌价成交。计算结果落在 3–9% 区间之外的收益率不予发布：那说明是真实租金除以估算价格，并非市场实况。",
      reference: "涨幅与基准数据：{source}。数据截至 {asOf}，{reviewBy} 前复核。",
    },
  },

  form: {
    title: "咨询顾问",
    subtitleAdvisory: "告诉我们把楼花房源与回报分析发送到哪里。",
    subtitleRelocation: "说明您的搬迁需求，我们会给出固定报价。",
    subtitleMaintenance: "确认您的房产，我们即刻安排检查。",
    subtitleFitout: "介绍您的空间，我们会回复概念方案与造价。",
    subtitleConstruction: "概述项目内容，我们会就许可与预算提供建议。",
    subtitleNetRoi: "告诉我们您的精选清单，我们会逐一测算净回报。",
    subtitleMortgage: "告诉我们您的情况，我们会为您引荐按揭顾问。",

    name: "姓名",
    namePlaceholder: "您的姓名",
    phone: "电话 / WhatsApp",
    phonePlaceholder: "+971 50 000 0000",
    email: "电子邮箱",
    emailPlaceholder: "you@example.com",
    emailOptional: "选填",
    notes: "还有什么需要我们了解",
    notesPlaceholder: "房产、时间安排或特定要求",
    floorPlan: "户型图",
    floorPlanChoose: "选择文件",
    floorPlanNone: "未选择文件",
    summaryTitle: "您的选择",
    submit: "发送并打开 WhatsApp",
    submitting: "发送中…",
    successTitle: "正在发送给我们",
    successBody: "我们正在打开 WhatsApp 并带上您的信息，一键即可发送。",
    successManual: "如果 WhatsApp 未打开，请点击这里。",
    errorRequired: "请填写姓名与电话号码。",
    errorPhone: "这个电话号码似乎不正确。",
    errorFileType: "请上传 PDF、JPG 或 PNG 文件。",
    errorFileSize: "该文件超过 10 MB。",
    errorGeneric: "保存时出了点问题 — 但您仍然可以通过 WhatsApp 联系我们。",
    close: "关闭",
    privacy: "我们仅将您的信息用于回复本次咨询。",
  },

  home: {
    developers: "当前项目来自",
    hero: {
      kicker: "迪拜 · 私人房地产办公室",
      title: "迪拜房产，[[私人顾问服务]]",
      subtitle: "迪拜知名开发商的期房配额、诚实的收益分析，以及交房之后的一站式团队：装修、建造与维护。",
      primary: "浏览项目",
      secondary: "预约咨询",
      caption: "Palace Beach Residence · Emaar Beachfront",
      scroll: "向下",
    },
    facts: {
      licensed: "DET 持牌",
      licensedValue: "执照编号 {licence}",
      languages: "咨询语言",
      languagesValue: "English · العربية · Русский · 中文",
      reply: "回复时间",
      replyValue: "一小时内",
      projects: "当前配额",
      projectsValue: "{count} 个项目 · {devs} 家开发商",
    },
    intro: {
      kicker: "关于我们",
      title: "一个私人办公室，覆盖在迪拜置业的[[每个阶段]]",
      body1: "多数买家要分别对接购房经纪、贷款银行、装修承包商和物业公司。每一方只看到局部，没有人对最终结果负责。",
      body2: "我们在同一个团队内管理资产的整个生命周期：购买、背后的数据、交房、室内设计和维护。无论您身在迪拜还是世界另一端，都由一位了解您房产的顾问全程对接。",
      pillars: {
        honest: "数字如实标注",
        honestDesc: "扣除所有费用后的净收益，而非宣传册上的毛收益。",
        remote: "为远程买家设计",
        remoteDesc: "无需飞来即可预订、签约和交房。",
        after: "不止于交易",
        afterDesc: "装修、建造与维护由同一团队完成。",
      },
    },
    featured: {
      kicker: "精选项目",
      title: "我们可为您[[争取的开发商配额]]",
      subtitle: "精选自 Emaar、Sobha、Nakheel、DAMAC 等开发商。所有信息均摘自开发商官方宣传册。",
      viewAll: "查看全部项目",
      view: "查看项目",
    },
    services: {
      kicker: "我们的服务",
      title: "先提供建议，再负责[[之后的一切]]",
      items: {
        acquisition: { title: "购房与期房", desc: "精选开发商配额、黄金签证规划，以及通过授权书远程购房。" },
        investors: { title: "投资分析", desc: "毛收益与净收益、服务费、按揭能力，以及首日实际所需现金。" },
        interiors: { title: "室内设计与装修", desc: "家具套餐与定制木作，让交付的毛坯变成家，或变成好租的房源。" },
        construction: { title: "建造与翻新", desc: "别墅扩建、泳池与整体翻新，并以您的名义代办所有许可。" },
      },
      explore: "了解更多",
    },
    figures: {
      kicker: "为何选择迪拜",
      title: "用[[四个数字]]说明",
      items: {
        tax: { value: "0%", label: "租金收入的个人所得税" },
        yield: { value: "~5.5–8.5%", label: "全市住宅大致毛租金收益率" },
        visa: { value: "AED 2M", label: "可申请 10 年黄金签证的房产价值" },
        freehold: { value: "100%", label: "指定区域内外国人永久产权" },
      },
      note: "仅为大致范围。收益因社区和单位差异很大，税务处理取决于您的居住身份。请咨询独立专业人士。",
    },
    tools: {
      kicker: "投资者工具",
      title: "在通话[[之前]]先算一算",
      subtitle: "与我们顾问使用的模型相同，向您开放。所有结果均为大致估算，并非报价。",
      approx: "所有数字均为大致估算",
      items: {
        roi: { title: "回报概况", desc: "输入预算和目标，获得大致收益及黄金签证资格。" },
        netRoi: { title: "净回报与服务费", desc: "扣除 DLD、中介、Mollak 及管理费后，房产的实际收益。" },
        mortgage: { title: "按揭能力", desc: "贷款成数上限、还款能力，以及过户时所需现金。" },
        market: { title: "市场数据", desc: "按登记处记录的成交量与价格走势。" },
      },
      cta: "打开投资者工具",
    },
    contact: {
      kicker: "私人咨询",
      title: "告诉我们您[[在寻找什么]]",
      body: "一次简短的交流，了解您的预算、时间和目标，没有照本宣科的推销。与您对话的是资深顾问，而不是呼叫中心。",
      whatsapp: "WhatsApp 联系",
      call: "致电 {phone}",
      form: "预约回电",
      hours: "周日至周五 9:00–20:00（海湾时间）· 一小时内回复",
    },
  },

  pages: {
    projects: {
      kicker: "期房配额",
      title: "当前[[项目]]",
      subtitle: "我们持有宣传册并可争取配额的开发商房源。可按开发商筛选，打开任一项目查看详情，并向我们索取最新价格表。",
      count: "{count} 个项目",
    },
    invest: {
      kicker: "投资者专区",
      title: "数字，[[如实标注]]",
      subtitle: "测算回报、查看扣除所有费用后的净收益、了解可贷金额，并按登记处数据解读市场。",
      approxTitle: "所有计算均为大致估算",
      approxBody: "这些工具给出的每个数字都是基于市场常见范围的估算。实际价格、费用、服务费和回报因楼宇和单位而异——在您做任何决定前，我们都会与您确认真实数字。",
      jump: { roi: "回报概况", netRoi: "净回报", mortgage: "按揭", market: "市场数据" },
    },
    services: {
      kicker: "交房之后",
      title: "[[业主]]服务",
      subtitle: "搬迁、室内设计与建造，由为您提供购房咨询的同一团队负责。",
    },
  },

  footer: {
    blurb: "一家私人客户事务所，覆盖迪拜资产的完整生命周期：购置、搬迁、精装、建造与长期养护。",
    services: "服务",
    contact: "联系方式",
    hours: "周日至周五，9:00–20:00（海湾时间）",
    rights: "版权所有。",
    legalName: "Lababidi For Real Estate Buying & Selling Brokerage CO. L.L.C S.O.C",
    address: "Office 327, Al Mansoori Building, Hor Al Anz, Deira, Dubai",
    disclaimerTitle: "重要提示",
    disclaimer:
      "本网站所示投资数字为参考性说明，并非估值、预测或个性化财务建议。居留门槛由阿联酋联邦主管机构规定，可能调整。投资前请务必取得独立的专业意见。",
  },

  common: {
    from: "起",
    upTo: "最高至",
    learnMore: "了解更多",
    getQuote: "获取报价",
    selectPlan: "选择方案",
    ratesNote: "按参考汇率自迪拉姆换算",
  },

  hubs: {
    jvt: "朱美拉三角村",
    alFurjan: "阿尔福詹",
    arjan: "阿尔詹",
    motorCity: "汽车城",
    sportsCity: "迪拜体育城",
    siliconOasis: "迪拜硅谷绿洲",
    damacHills: "达马克山庄",
    damacHills2: "达马克山庄 2",
    townSquare: "城镇广场",
    mbrCity: "穆罕默德·本·拉希德城",
    bluewaters: "蓝水岛",
    jbr: "朱美拉海滩住宅区",
    cityWalk: "城市漫步",
    difc: "迪拜国际金融中心",
    dubaiHarbour: "迪拜港",
    dubaiIslands: "迪拜群岛",
    theGreens: "绿地与景观区",
    barshaHeights: "巴尔沙高地",
    emiratesLiving: "阿联酋生活区",
    tilalAlGhaf: "提拉尔加夫",
    theValley: "山谷社区",
    emaarSouth: "艾马尔南城",
    mudon: "穆顿",
    dubaiSciencePark: "迪拜科学园",
    rashidYachts: "拉希德游艇码头",
    jvc: "朱美拉环形村",
    dubaiSouth: "迪拜南城",
    businessBay: "商业湾",
    dubaiMarina: "迪拜码头",
    creekHarbour: "迪拜溪港",
    downtown: "迪拜市中心",
    dubaiHills: "迪拜山庄",
    emaarBeachfront: "艾马尔海滨",
    arabianRanches: "阿拉伯牧场",
    palmJumeirah: "棕榈朱美拉",
    jumeirahGolf: "朱美拉高尔夫庄园",
    jlt: "朱美拉湖塔",
  },

  bedrooms: {
    studio: "开间",
    "1bed": "一居",
    "2bed": "两居",
    "3bed": "三居",
    "4bed": "四居别墅",
    "5bed": "五居别墅",
  },

  assetType: {
    apartment: "公寓",
    villa: "别墅",
    mixed: "公寓与别墅",
  },
};
