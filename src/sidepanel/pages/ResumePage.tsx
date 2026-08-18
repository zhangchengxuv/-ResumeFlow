import { useState } from 'react'
import { Button } from '../../components/Button'
import { FormField, TextAreaField } from '../../components/FormField'
import type { BasicInfo, Education, Experience, Project, Resume, ResumeSection, Skills } from '../../types/resume'

interface Props {
  resume: Resume
  onChange: (resume: Resume) => void
  onSave: () => Promise<void>
}

const sections: Array<{ id: ResumeSection; label: string }> = [
  { id: 'basic', label: '基本信息' }, { id: 'education', label: '教育经历' },
  { id: 'projects', label: '项目经历' }, { id: 'experience', label: '实习经历' },
  { id: 'skills', label: '技能' },
]

const basicFields: Array<{ key: keyof BasicInfo; label: string; type?: string }> = [
  { key: 'name', label: '姓名' }, { key: 'englishName', label: '英文名' }, { key: 'gender', label: '性别' },
  { key: 'birthDate', label: '出生日期', type: 'date' }, { key: 'phone', label: '手机号', type: 'tel' },
  { key: 'email', label: '邮箱', type: 'email' }, { key: 'city', label: '所在城市' }, { key: 'hometown', label: '籍贯' },
  { key: 'targetCity', label: '求职城市' }, { key: 'targetRole', label: '求职岗位' },
  { key: 'github', label: 'GitHub', type: 'url' }, { key: 'website', label: '个人网站', type: 'url' },
]

const skillFields: Array<{ key: keyof Skills; label: string }> = [
  { key: 'programming', label: '编程语言' }, { key: 'tools', label: '软件工具' }, { key: 'embedded', label: '嵌入式' },
  { key: 'robotics', label: '机器人' }, { key: 'mechanical', label: '机械设计' }, { key: 'english', label: '英语能力' },
  { key: 'other', label: '其他技能' },
]

const newEducation = (): Education => ({ id: crypto.randomUUID(), school: '', degree: '', major: '', startDate: '', endDate: '', gpa: '', ranking: '', research: '', description: '' })
const newProject = (): Project => ({ id: crypto.randomUUID(), name: '', role: '', startDate: '', endDate: '', description: '', responsibilities: '', techStack: '' })
const newExperience = (): Experience => ({ id: crypto.randomUUID(), company: '', department: '', role: '', startDate: '', endDate: '', description: '' })

export function ResumePage({ resume, onChange, onSave }: Props) {
  const [section, setSection] = useState<ResumeSection>('basic')
  const [saving, setSaving] = useState(false)

  const save = async () => {
    setSaving(true)
    await onSave()
    setSaving(false)
  }

  const updateBasic = (key: keyof BasicInfo, value: string) => onChange({ ...resume, basic: { ...resume.basic, [key]: value } })
  const updateSkills = (key: keyof Skills, value: string) => onChange({ ...resume, skills: { ...resume.skills, [key]: value } })
  const updateEducation = (id: string, key: Exclude<keyof Education, 'id'>, value: string) => onChange({ ...resume, education: resume.education.map((item) => item.id === id ? { ...item, [key]: value } : item) })
  const updateProject = (id: string, key: Exclude<keyof Project, 'id'>, value: string) => onChange({ ...resume, projects: resume.projects.map((item) => item.id === id ? { ...item, [key]: value } : item) })
  const updateExperience = (id: string, key: Exclude<keyof Experience, 'id'>, value: string) => onChange({ ...resume, experience: resume.experience.map((item) => item.id === id ? { ...item, [key]: value } : item) })

  return <div className="page-stack">
    <header className="page-header page-header--split"><div><span className="eyebrow">本地资料库</span><h1>我的简历</h1><p>数据仅保存在当前浏览器</p></div><Button variant="primary" icon="check" onClick={save} disabled={saving}>{saving ? '保存中…' : '保存修改'}</Button></header>
    <nav className="section-tabs" aria-label="简历分类">
      {sections.map((item) => <button className={section === item.id ? 'is-active' : ''} onClick={() => setSection(item.id)} key={item.id}>{item.label}</button>)}
    </nav>

    {section === 'basic' && <section><div className="section-heading"><div><h2>基本信息</h2><p>用于联系方式和求职意向字段。</p></div></div><div className="form-grid">{basicFields.map((field) => <FormField key={field.key} label={field.label} type={field.type ?? 'text'} value={resume.basic[field.key]} onChange={(event) => updateBasic(field.key, event.target.value)} />)}</div></section>}

    {section === 'education' && <section><div className="section-heading"><div><h2>教育经历</h2><p>自动填写时默认使用第一条记录。</p></div><Button icon="plus" onClick={() => onChange({ ...resume, education: [...resume.education, newEducation()] })}>添加经历</Button></div><div className="experience-list">{resume.education.map((item, index) => <details className="experience-card" key={item.id} open={index === 0}><summary><div><strong>{item.school || '未命名学校'}</strong><span>{[item.degree, item.major].filter(Boolean).join(' · ') || '填写学历与专业'}</span><small>{item.startDate || '开始时间'} — {item.endDate || '结束时间'}</small></div><span className="more">编辑</span></summary><div className="experience-card__form form-grid">
      <FormField label="学校" value={item.school} onChange={(e) => updateEducation(item.id, 'school', e.target.value)} /><FormField label="学历" value={item.degree} onChange={(e) => updateEducation(item.id, 'degree', e.target.value)} /><FormField label="专业" value={item.major} onChange={(e) => updateEducation(item.id, 'major', e.target.value)} /><FormField label="入学时间" type="month" value={item.startDate} onChange={(e) => updateEducation(item.id, 'startDate', e.target.value)} /><FormField label="毕业时间" type="month" value={item.endDate} onChange={(e) => updateEducation(item.id, 'endDate', e.target.value)} /><FormField label="GPA" value={item.gpa} onChange={(e) => updateEducation(item.id, 'gpa', e.target.value)} /><FormField label="排名" value={item.ranking} onChange={(e) => updateEducation(item.id, 'ranking', e.target.value)} /><FormField label="研究方向" value={item.research} onChange={(e) => updateEducation(item.id, 'research', e.target.value)} /><TextAreaField label="经历描述" value={item.description} onChange={(e) => updateEducation(item.id, 'description', e.target.value)} />
      <div className="form-actions"><Button variant="danger" icon="trash" onClick={() => onChange({ ...resume, education: resume.education.filter((entry) => entry.id !== item.id) })}>删除</Button></div>
    </div></details>)}</div></section>}

    {section === 'projects' && <section><div className="section-heading"><div><h2>项目经历</h2><p>突出角色、职责和关键技术。</p></div><Button icon="plus" onClick={() => onChange({ ...resume, projects: [...resume.projects, newProject()] })}>添加项目</Button></div><div className="experience-list">{resume.projects.map((item, index) => <details className="experience-card" key={item.id} open={index === 0}><summary><div><strong>{item.name || '未命名项目'}</strong><span>{item.role || '填写项目角色'}</span><small>{item.startDate || '开始时间'} — {item.endDate || '结束时间'}</small></div><span className="more">编辑</span></summary><div className="experience-card__form form-grid">
      <FormField label="项目名称" value={item.name} onChange={(e) => updateProject(item.id, 'name', e.target.value)} /><FormField label="项目角色" value={item.role} onChange={(e) => updateProject(item.id, 'role', e.target.value)} /><FormField label="开始时间" type="month" value={item.startDate} onChange={(e) => updateProject(item.id, 'startDate', e.target.value)} /><FormField label="结束时间" type="month" value={item.endDate} onChange={(e) => updateProject(item.id, 'endDate', e.target.value)} /><TextAreaField label="项目描述" value={item.description} onChange={(e) => updateProject(item.id, 'description', e.target.value)} /><TextAreaField label="个人职责" value={item.responsibilities} onChange={(e) => updateProject(item.id, 'responsibilities', e.target.value)} /><FormField label="技术栈" value={item.techStack} onChange={(e) => updateProject(item.id, 'techStack', e.target.value)} />
      <div className="form-actions"><Button variant="danger" icon="trash" onClick={() => onChange({ ...resume, projects: resume.projects.filter((entry) => entry.id !== item.id) })}>删除</Button></div>
    </div></details>)}</div></section>}

    {section === 'experience' && <section><div className="section-heading"><div><h2>实习 / 工作经历</h2><p>记录公司、岗位与可验证的工作成果。</p></div><Button icon="plus" onClick={() => onChange({ ...resume, experience: [...resume.experience, newExperience()] })}>添加经历</Button></div><div className="experience-list">{resume.experience.map((item, index) => <details className="experience-card" key={item.id} open={index === 0}><summary><div><strong>{item.company || '未命名公司'}</strong><span>{[item.department, item.role].filter(Boolean).join(' · ') || '填写部门与岗位'}</span><small>{item.startDate || '开始时间'} — {item.endDate || '结束时间'}</small></div><span className="more">编辑</span></summary><div className="experience-card__form form-grid">
      <FormField label="公司" value={item.company} onChange={(e) => updateExperience(item.id, 'company', e.target.value)} /><FormField label="部门" value={item.department} onChange={(e) => updateExperience(item.id, 'department', e.target.value)} /><FormField label="岗位" value={item.role} onChange={(e) => updateExperience(item.id, 'role', e.target.value)} /><FormField label="开始时间" type="month" value={item.startDate} onChange={(e) => updateExperience(item.id, 'startDate', e.target.value)} /><FormField label="结束时间" type="month" value={item.endDate} onChange={(e) => updateExperience(item.id, 'endDate', e.target.value)} /><TextAreaField label="工作描述" value={item.description} onChange={(e) => updateExperience(item.id, 'description', e.target.value)} />
      <div className="form-actions"><Button variant="danger" icon="trash" onClick={() => onChange({ ...resume, experience: resume.experience.filter((entry) => entry.id !== item.id) })}>删除</Button></div>
    </div></details>)}</div></section>}

    {section === 'skills' && <section><div className="section-heading"><div><h2>技能</h2><p>建议使用顿号分隔关键词，便于快速填写。</p></div></div><div className="form-grid">{skillFields.map((field) => <TextAreaField key={field.key} label={field.label} rows={2} value={resume.skills[field.key]} onChange={(event) => updateSkills(field.key, event.target.value)} />)}</div></section>}
  </div>
}
