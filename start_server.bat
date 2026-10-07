@echo off
chcp 65001 > nul
echo ========================================================
echo   반응형 뷰포트 스튜디오 (Responsive Viewport Studio)
echo   모바일 / 태블릿 / PC 화면 비교 웹페이지 실행 중...
echo ========================================================
echo.
echo 브라우저에서 아래 주소로 접속하세요:
echo http://localhost:8080
echo.
echo (종료하려면 이 창에서 Ctrl + C 를 누르세요)
echo.
start http://localhost:8080
python server.py 8080
