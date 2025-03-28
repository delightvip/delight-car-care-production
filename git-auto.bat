@echo off
echo 🔄 Pulling latest changes from origin/main...
git pull origin main

echo ✅ Pull complete.
echo 📝 Adding all changes...
git add .

set /p message=🗒️ Enter commit message: 
git commit -m "%message%"

echo 🚀 Pushing changes to origin/main...
git push origin main

echo ✅ All done!
pause
