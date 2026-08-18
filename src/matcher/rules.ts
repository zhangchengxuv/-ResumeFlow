import type { ResumeFieldPath } from '../types/resume'

export interface MatchRule {
  path: ResumeFieldPath
  label: string
  keywords: string[]
  conflicts?: string[]
  inputTypes?: string[]
  autocomplete?: string[]
}

export const MATCH_RULES: MatchRule[] = [
  { path: 'basic.name', label: '姓名', keywords: ['姓名', '名字', '真实姓名', '中文名', 'full name', 'your name', 'name'], conflicts: ['英文', 'english', '公司', '项目'] },
  { path: 'basic.englishName', label: '英文名', keywords: ['英文名', '英文姓名', 'english name', 'preferred name'], conflicts: ['公司'] },
  { path: 'basic.gender', label: '性别', keywords: ['性别', 'gender', 'sex'] },
  { path: 'basic.birthDate', label: '出生日期', keywords: ['出生日期', '出生年月', '生日', 'date of birth', 'birth date', 'birthday'], inputTypes: ['date'] },
  { path: 'basic.phone', label: '联系电话', keywords: ['联系电话', '手机号码', '手机号', '手机', '电话', 'mobile phone', 'phone number', 'telephone', 'mobile', 'phone'], inputTypes: ['tel'], autocomplete: ['tel'] },
  { path: 'basic.email', label: '电子邮箱', keywords: ['电子邮箱', '邮箱地址', '邮箱', '电子邮件', 'email address', 'e-mail', 'email'], inputTypes: ['email'], autocomplete: ['email'] },
  { path: 'basic.city', label: '所在城市', keywords: ['所在城市', '现居城市', '当前城市', '居住地', '现居地', 'current city', 'location'], conflicts: ['期望', '求职', '意向'] },
  { path: 'basic.hometown', label: '籍贯', keywords: ['籍贯', '户籍所在地', '户籍', 'hometown', 'native place'] },
  { path: 'basic.targetCity', label: '期望城市', keywords: ['期望城市', '求职城市', '意向城市', '工作地点', '期望工作地', 'desired city', 'preferred location'] },
  { path: 'basic.targetRole', label: '求职岗位', keywords: ['求职岗位', '应聘职位', '意向岗位', '期望职位', '目标岗位', 'position applied', 'desired position'] },
  { path: 'basic.github', label: 'GitHub', keywords: ['github', 'github 地址', '代码仓库'], inputTypes: ['url'] },
  { path: 'basic.website', label: '个人网站', keywords: ['个人网站', '个人主页', '作品集', 'portfolio', 'personal website', 'website'], inputTypes: ['url'], conflicts: ['公司'] },
  { path: 'education.school', label: '毕业院校', keywords: ['毕业院校', '学校名称', '就读学校', '学校', '高校', '院校', 'university', 'college', 'school'], conflicts: ['中学'] },
  { path: 'education.degree', label: '学历', keywords: ['最高学历', '学历', '学位', 'degree', 'education level', 'qualification'], conflicts: ['专业'] },
  { path: 'education.major', label: '专业', keywords: ['专业名称', '所学专业', '主修专业', '专业', 'major', 'field of study'], conflicts: ['技能'] },
  { path: 'education.startDate', label: '入学时间', keywords: ['入学时间', '入学日期', '教育开始时间', 'start of education', 'enrollment date'] },
  { path: 'education.endDate', label: '毕业时间', keywords: ['毕业时间', '毕业日期', '教育结束时间', 'graduation date', 'graduation year'] },
  { path: 'education.gpa', label: 'GPA', keywords: ['平均绩点', '绩点', 'gpa', 'grade point'] },
  { path: 'education.ranking', label: '专业排名', keywords: ['专业排名', '班级排名', '成绩排名', '排名', 'ranking', 'rank'] },
  { path: 'education.research', label: '研究方向', keywords: ['研究方向', '研究领域', 'research direction', 'research area'] },
  { path: 'education.description', label: '教育经历描述', keywords: ['教育经历描述', '教育描述', '在校经历', 'education description'] },
  { path: 'projects.name', label: '项目名称', keywords: ['项目名称', '项目名', 'project name', 'project title'], conflicts: ['公司'] },
  { path: 'projects.role', label: '项目角色', keywords: ['项目角色', '担任角色', 'project role'] },
  { path: 'projects.startDate', label: '项目开始时间', keywords: ['项目开始时间', '项目起始时间', 'project start date'] },
  { path: 'projects.endDate', label: '项目结束时间', keywords: ['项目结束时间', 'project end date'] },
  { path: 'projects.description', label: '项目描述', keywords: ['项目描述', '项目介绍', '项目内容', 'project description', 'describe project'] },
  { path: 'projects.responsibilities', label: '个人职责', keywords: ['个人职责', '项目职责', '主要职责', 'responsibilities', 'contribution'] },
  { path: 'projects.techStack', label: '技术栈', keywords: ['技术栈', '项目技术', '使用技术', 'tech stack', 'technologies'] },
  { path: 'experience.company', label: '公司', keywords: ['公司名称', '实习公司', '工作单位', '雇主', 'company name', 'employer', 'company'], conflicts: ['学校'] },
  { path: 'experience.department', label: '部门', keywords: ['所在部门', '部门名称', '部门', 'department', 'division'] },
  { path: 'experience.role', label: '工作岗位', keywords: ['工作岗位', '实习岗位', '职位名称', '职务', 'job title', 'position', 'role'], conflicts: ['应聘', '期望'] },
  { path: 'experience.startDate', label: '工作开始时间', keywords: ['工作开始时间', '入职时间', '实习开始时间', 'employment start date'] },
  { path: 'experience.endDate', label: '工作结束时间', keywords: ['工作结束时间', '离职时间', '实习结束时间', 'employment end date'] },
  { path: 'experience.description', label: '工作描述', keywords: ['工作描述', '实习描述', '工作内容', '经历描述', 'work description', 'job description'] },
  { path: 'skills.programming', label: '编程语言', keywords: ['编程语言', '程序语言', 'programming language', 'coding skills'] },
  { path: 'skills.tools', label: '软件工具', keywords: ['软件工具', '开发工具', '工具软件', 'software tools', 'tools'] },
  { path: 'skills.embedded', label: '嵌入式技能', keywords: ['嵌入式', '单片机', 'embedded', 'mcu'] },
  { path: 'skills.robotics', label: '机器人技能', keywords: ['机器人技能', '机器人', 'robotics', 'ros'] },
  { path: 'skills.mechanical', label: '机械设计', keywords: ['机械设计', '结构设计', 'mechanical design', 'cad'] },
  { path: 'skills.english', label: '英语能力', keywords: ['英语能力', '英语水平', '外语水平', 'english proficiency', 'english level'] },
  { path: 'skills.other', label: '其他技能', keywords: ['其他技能', '技能特长', '专业技能', 'other skills', 'skills'] },
  { path: 'snippets.selfEvaluation', label: '自我评价', keywords: ['自我评价', '自我介绍', '个人评价', '个人总结', 'self evaluation', 'about yourself', 'summary'] },
  { path: 'snippets.personalStrengths', label: '个人优势', keywords: ['个人优势', '核心优势', '竞争力', 'strengths', 'advantages'] },
  { path: 'snippets.careerPlan', label: '职业规划', keywords: ['职业规划', '未来规划', '职业目标', 'career plan', 'career goals'] },
  { path: 'snippets.projectIntro', label: '项目介绍', keywords: ['项目介绍', '项目概述', 'project overview'], conflicts: ['名称'] },
]

export const fieldLabel = (path: ResumeFieldPath | '') =>
  MATCH_RULES.find((rule) => rule.path === path)?.label ?? '暂未确认'
