# AWS 배포 가이드 (백엔드)

## 서버 정보

| 항목 | 값 |
|---|---|
| 인스턴스 이름 | Yakssook-Backend-Server (`i-0470fd78659e6429d`) |
| 인스턴스 타입 | t3.small |
| OS | Ubuntu 24.04 |
| 리전 | ap-northeast-2 (서울) |
| 퍼블릭 IP | AWS 콘솔에서 매번 확인 (탄력적 IP 미설정이라 인스턴스 재시작마다 바뀜) |
| SSH 사용자명 | `ubuntu` |
| 키페어 | `yakssook-key.pem` / `yakssook-key.ppk` |
| 앱 포트 | 8080 (보안그룹에 인바운드 규칙 추가되어 있음) |

## DB 정보

- 이 인스턴스에 **MySQL 8.0이 이미 설치되어 있음** (전 프로젝트에서 설치된 것을 그대로 재사용, MariaDB 아님)
- DB명: `interview_db`
- 앱 계정: `interview_app` (비밀번호는 팀 내에서 별도 공유 — 이 문서엔 기록하지 않음)
- 접속: `mysql -u interview_app -p interview_db` (서버 안에서), 또는 `sudo mysql`로 root 접속(비밀번호 없이 sudo 권한으로 인증됨)

## 1. 서버 접속

```powershell
ssh -i "yakssook-key.pem 경로" ubuntu@<퍼블릭IP>
```

Windows에서 `.pem` 파일 권한 문제로 접속이 거부되면:
```powershell
icacls "yakssook-key.pem 경로" /inheritance:r
icacls "yakssook-key.pem 경로" /grant:r "$($env:USERNAME):(R)"
```

PuTTY를 쓰는 경우 `.ppk` 파일로 접속 (Host: 퍼블릭IP, 사용자명: `ubuntu`).

## 2. 코드 재배포 (수정된 백엔드 코드를 서버에 반영할 때)

**내 PC에서 빌드**
```powershell
cd backend
./mvnw clean package -DskipTests
```

**서버로 jar 전송** (내 PC 터미널에서, SSH 세션 아님)
```powershell
scp -i "yakssook-key.pem 경로" "backend/target/backend-0.0.1-SNAPSHOT.jar" ubuntu@<퍼블릭IP>:~/backend.jar
```

**설정 파일이 바뀌었다면 같이 전송** (`application-example.yml`을 참고해서 실제 값 채운 파일을, DB 비밀번호만 서버용으로 해서 `~/application.yml`로 전송 — 이 파일은 `backend.jar`와 같은 디렉토리에 있어야 자동으로 인식됨)

**서버에서 기존 앱 종료 후 재실행**
```bash
ps aux | grep backend.jar      # PID 확인
kill <PID>                     # 기존 프로세스 종료
nohup java -Xmx512m -jar backend.jar > app.log 2>&1 &
```

## 3. 앱 시작/종료

**시작**
```bash
nohup java -Xmx512m -jar backend.jar > app.log 2>&1 &
```
`nohup ... &`로 실행해야 SSH 연결이 끊겨도(터미널을 닫아도) 계속 실행됩니다.

**종료**
```bash
ps aux | grep backend.jar
kill <PID>
```

**상태 확인**
```bash
curl http://localhost:8080/api/health   # 서버 안에서
tail -30 app.log                        # 로그 확인
```
내 PC에서 외부 접속 확인: `curl.exe http://<퍼블릭IP>:8080/api/health` (PowerShell은 `curl` 대신 반드시 `curl.exe` 사용 — 기본 `curl`은 PowerShell의 `Invoke-WebRequest` 별칭이라 옵션 문법이 다름)

## 4. 인스턴스 재부팅 시 주의사항

- **MySQL**은 시스템 서비스로 자동 시작됨 — 별도 작업 불필요
- **백엔드 앱은 자동 시작 안 됨** — 재부팅 후 위 "앱 시작" 절차를 다시 실행해야 함 (추후 systemd 서비스로 등록하면 자동화 가능, 아직 미적용)
- 탄력적 IP를 설정하지 않아서 **인스턴스를 중지했다가 다시 시작하면 퍼블릭 IP가 바뀔 수 있음** — 재확인 필요

## 5. 인스턴스 중지 시

AWS 콘솔 → EC2 → 인스턴스 선택 → 인스턴스 상태 → 중지. **"OS 종료 건너뛰기" 옵션은 체크하지 않음** (강제 종료라 DB 손상 위험 있음, 긴급 상황 전용).

## 참고: PowerShell에서 curl로 JSON 요청 테스트할 때

작은따옴표 안에 큰따옴표가 있는 JSON을 인라인으로 넘기면 따옴표가 유실되는 PowerShell 고질적 버그가 있음. 파일로 저장 후 전송하는 방식을 권장:
```powershell
'{"email":"test@example.com","password":"password123","name":"test"}' | Set-Content -Encoding ascii -NoNewline signup.json
curl.exe -X POST http://<퍼블릭IP>:8080/api/auth/signup -H "Content-Type: application/json" -d "@signup.json"
```
