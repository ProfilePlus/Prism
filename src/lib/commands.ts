import { Command } from '../components/shell/CommandPalette';

export const ALL_COMMANDS: Command[] = [
  // 文件
  { id: 'new', label: '新建文档', category: '文件', shortcut: 'Ctrl+N', keywords: ['create', 'file'] },
  { id: 'open', label: '打开文件', category: '文件', shortcut: 'Ctrl+O', keywords: ['open', 'file'] },
  { id: 'openFolder', label: '打开文件夹', category: '文件', shortcut: 'Ctrl+Shift+O', keywords: ['folder'] },
  { id: 'save', label: '保存', category: '文件', shortcut: 'Ctrl+S', keywords: ['save'] },
  { id: 'saveAs', label: '另存为', category: '文件', shortcut: 'Ctrl+Shift+S', keywords: ['save as'] },
  { id: 'print', label: '打印', category: '文件', shortcut: 'Ctrl+P', keywords: ['print'] },

  // 编辑
  { id: 'undo', label: '撤销', category: '编辑', shortcut: 'Ctrl+Z', keywords: ['undo'] },
  { id: 'redo', label: '重做', category: '编辑', shortcut: 'Ctrl+Y', keywords: ['redo'] },
  { id: 'cut', label: '剪切', category: '编辑', shortcut: 'Ctrl+X', keywords: ['cut'] },
  { id: 'copy', label: '复制', category: '编辑', shortcut: 'Ctrl+C', keywords: ['copy'] },
  { id: 'paste', label: '粘贴', category: '编辑', shortcut: 'Ctrl+V', keywords: ['paste'] },
  { id: 'showSearch', label: '查找', category: '编辑', shortcut: 'Ctrl+F', keywords: ['find', 'search'] },
  { id: 'showReplace', label: '替换', category: '编辑', shortcut: 'Ctrl+H', keywords: ['replace', 'find'] },
  { id: 'exportHtml', label: '导出为 HTML', category: '文件', keywords: ['export', 'html'] },
  { id: 'exportPdf', label: '导出为 PDF', category: '文件', keywords: ['export', 'pdf'] },
  { id: 'exportDocx', label: '导出为 Word', category: '文件', keywords: ['export', 'word', 'docx'] },
  { id: 'exportPng', label: '导出为 PNG 图像', category: '文件', keywords: ['export', 'png', 'image'] },

  // 格式
  { id: 'bold', label: '加粗', category: '格式', shortcut: 'Ctrl+B', keywords: ['bold'] },
  { id: 'italic', label: '斜体', category: '格式', shortcut: 'Ctrl+I', keywords: ['italic'] },
  { id: 'underline', label: '下划线', category: '格式', shortcut: 'Ctrl+U', keywords: ['underline'] },
  { id: 'strikethrough', label: '删除线', category: '格式', keywords: ['strikethrough'] },
  { id: 'inlineCode', label: '行内代码', category: '格式', shortcut: 'Ctrl+`', keywords: ['code'] },
  { id: 'link', label: '插入链接', category: '格式', shortcut: 'Ctrl+K', keywords: ['link'] },

  // 段落
  { id: 'heading1', label: '一级标题', category: '段落', shortcut: 'Ctrl+1', keywords: ['h1', 'heading'] },
  { id: 'heading2', label: '二级标题', category: '段落', shortcut: 'Ctrl+2', keywords: ['h2', 'heading'] },
  { id: 'heading3', label: '三级标题', category: '段落', shortcut: 'Ctrl+3', keywords: ['h3', 'heading'] },
  { id: 'paragraph', label: '正文', category: '段落', shortcut: 'Ctrl+0', keywords: ['paragraph'] },
  { id: 'bulletList', label: '无序列表', category: '段落', keywords: ['list', 'bullet'] },
  { id: 'orderedList', label: '有序列表', category: '段落', keywords: ['list', 'ordered'] },
  { id: 'taskList', label: '任务列表', category: '段落', keywords: ['todo', 'task'] },
  { id: 'blockquote', label: '引用', category: '段落', keywords: ['quote'] },
  { id: 'codeBlock', label: '代码块', category: '段落', keywords: ['code', 'block'] },

  // 视图
  { id: 'sourceMode', label: '源码模式', category: '视图', shortcut: 'Ctrl+1', keywords: ['edit', 'source'] },
  { id: 'splitMode', label: '分栏模式', category: '视图', shortcut: 'Ctrl+2', keywords: ['split'] },
  { id: 'previewMode', label: '预览模式', category: '视图', shortcut: 'Ctrl+3', keywords: ['preview'] },
  { id: 'toggleSidebar', label: '切换侧边栏', category: '视图', shortcut: 'Ctrl+\\', keywords: ['sidebar'] },
  { id: 'showOutline', label: '显示大纲', category: '视图', keywords: ['outline'] },
  { id: 'showFiles', label: '显示文件', category: '视图', keywords: ['files'] },
  { id: 'focusMode', label: '专注模式', category: '视图', shortcut: 'F8', keywords: ['focus'] },
  { id: 'typewriterMode', label: '打字机模式', category: '视图', keywords: ['typewriter'] },
  { id: 'statusBar', label: '切换状态栏', category: '视图', keywords: ['status'] },
  { id: 'actualSize', label: '实际大小', category: '视图', shortcut: 'Ctrl+Shift+9', keywords: ['zoom', 'reset'] },
  { id: 'zoomIn', label: '放大', category: '视图', shortcut: 'Ctrl+Shift+=', keywords: ['zoom', 'in'] },
  { id: 'zoomOut', label: '缩小', category: '视图', shortcut: 'Ctrl+Shift+-', keywords: ['zoom', 'out'] },

  // 窗口
  { id: 'alwaysOnTop', label: '窗口置顶', category: '窗口', keywords: ['top', 'pin'] },
  { id: 'devTools', label: '开发者工具', category: '窗口', shortcut: 'Shift+F12', keywords: ['dev', 'debug'] },

  // 帮助
  { id: 'about', label: '关于 Prism', category: '帮助', keywords: ['about', 'info'] },
  { id: 'docs', label: '查看文档', category: '帮助', keywords: ['docs', 'help'] },
];
