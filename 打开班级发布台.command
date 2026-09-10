#!/bin/zsh
cd -- "${0:A:h}" || exit 1
export PATH="/opt/homebrew/bin:/usr/local/bin:$PATH"
if ! command -v npm >/dev/null 2>&1; then
  print '找不到 Node.js，请在安装 Node.js 后重新打开。'
  read '?按回车关闭'
  exit 1
fi
print '班级发布台将在浏览器中打开。使用期间请保持这个窗口开启，结束时按 Control+C。'
npm run manage
