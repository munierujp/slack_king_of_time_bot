[![JavaScript Style Guide](https://img.shields.io/badge/code_style-standard-brightgreen.svg)](https://standardjs.com)

# slack_king_of_time_bot
KING OF TIMEの勤怠情報をSlackに投稿するBOT

## プロパティ
|プロパティ|説明|例|
|---|---|---|
|`KINGOFTIME_ID`|KING OF TIMEのID|-|
|`KINGOFTIME_PASSWORD`|KING OF TIMEのパスワード|-|
|`KINGOFTIME_SESSION`|KING OF TIMEのセッション|-|
|`KINGOFTIME_URL_LOGIN`|KING OF TIMEのログインURL|`https://s3.kingtime.jp/admin`|
|`KINGOFTIME_URL_ROOT`|KING OF TIMEのルートURL|`https://s3.kingtime.jp`|
|`LAST_PUNCHED_IN_AT`|最終出勤日時|-|
|`LAST_PUNCHED_OUT_AT`|最終退勤日時|-|
|`LOGIN_RETRY_COUNT`|ログインをリトライする回数|`1`|
|`MESSAGE_TEMPLATE_PUHCHED_IN`|出勤メッセージのテンプレート|`{{time}} ムニエルさんが出勤しました。`|
|`MESSAGE_TEMPLATE_PUHCHED_OUT`|退勤メッセージのテンプレート|`{{time}} ムニエルさんが退勤しました。`|
|`SESSION_TIMEOUT_MINUTES`|セッションのタイムアウト時間（分）|`30`|
|`TIMEZONE_OFFSET`|タイムゾーンのオフセット|`+0900`|
|`WEBHOOK_URL`|SlackのWebhook URL|`https://hooks.slack.com/services/T00000000/B00000000/XXXXXXXXXXXXXXXXXXXXXXXX`|

### MESSAGE_TEMPLATE_PUHCHED_IN
[MESSAGE_TEMPLATE_PUHCHED_IN.md](MESSAGE_TEMPLATE_PUHCHED_IN.md)を参照してください。

### MESSAGE_TEMPLATE_PUHCHED_OUT
[MESSAGE_TEMPLATE_PUHCHED_OUT.md](MESSAGE_TEMPLATE_PUHCHED_OUT.md)を参照してください。

## ライブラリ
以下のライブラリを使用しています。

|ライブラリ|プロジェクトキー|
|---|---|
|Moment|`MHMchiX6c1bwSqGM1PZiW_PxhMjh3Sh48`|
|Mustache|`13re0EpD6XiVa5zHXndGiYtcH-QMnbeE5MJH190pJ8xCYhmuW5sX2ZO5R`|
