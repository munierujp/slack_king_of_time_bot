var moment = Moment.moment

var properties = PropertiesService.getScriptProperties()
var KINGOFTIME_ID = properties.getProperty('KINGOFTIME_ID')
var KINGOFTIME_PASSWORD = properties.getProperty('KINGOFTIME_PASSWORD')
var KINGOFTIME_URL_LOGIN = properties.getProperty('KINGOFTIME_URL_LOGIN')
var KINGOFTIME_URL_ROOT = properties.getProperty('KINGOFTIME_URL_ROOT')
var LOGIN_RETRY_COUNT = Number(properties.getProperty('LOGIN_RETRY_COUNT'))
var MY_NAME = properties.getProperty('MY_NAME')
var SESSION_TIMEOUT_MINUTES = Number(properties.getProperty('SESSION_TIMEOUT_MINUTES'))
var TIMEZONE_OFFSET = properties.getProperty('TIMEZONE_OFFSET')
var WEBHOOK_URL = properties.getProperty('WEBHOOK_URL')

var PROPERTY_KEY_KINGOFTIME_SESSION = 'KINGOFTIME_SESSION'
var PROPERTY_KEY_LAST_PUNCHED_IN_AT = 'LAST_PUNCHED_IN_AT'
var PROPERTY_KEY_LAST_PUNCHED_OUT_AT = 'LAST_PUNCHED_OUT_AT'

function exec () {
  // 今日の退勤情報を投稿済みなら終了
  var today = new Date()
  var lastPunchedOutAt = properties.getProperty(PROPERTY_KEY_LAST_PUNCHED_OUT_AT)
  var punchedOutMessageHasPosted = lastPunchedOutAt && moment(lastPunchedOutAt).isSame(today, 'day')
  if (punchedOutMessageHasPosted) {
    return
  }

  // KING OF TIMEにログイン
  var session = loadSession_()
  if (!sessionWouldAlive_(session)) {
    session = login_()
    saveSession_(session)
  }

  // KING OF TIMEからタイムカードページを取得
  var timeCardPage = fetchTimeCardPage_(session)

  // タイムカードページの取得に失敗したら成功するまで取得を試みる
  if (!timeCardPage) {
    for (var i = 1; i <= LOGIN_RETRY_COUNT; i++) {
      session = login_()
      saveSession_(session)
      timeCardPage = fetchTimeCardPage_(session)
      if (timeCardPage) {
        break
      }
    }
    if (!timeCardPage) {
      var tryCount = LOGIN_RETRY_COUNT + 1
      Logger.log('KING OF TIMEへのログインに' + tryCount + '回連続で失敗しました。実行を終了します。')
      return
    }
  }

  // タイムカードページから今日の行を取得
  var todayRow = findTimeCardRow_(timeCardPage, today)
  var todayDate = formatDate_(today, 'yyyy-MM-dd')

  // 出勤情報をSlackに投稿
  var lastPunchedInAt = properties.getProperty(PROPERTY_KEY_LAST_PUNCHED_IN_AT)
  var punchedInMessageHasPosted = lastPunchedInAt && moment(lastPunchedInAt).isSame(today, 'day')
  if (!punchedInMessageHasPosted) {
    var punchedInTime = todayRow.match('<td +class="start_end_timerecord( | .+)?"( | .+ )data-ht-sort-index="START_TIMERECORD" *>(.|\r|\n)+?</td>')[0].match('[0-9]{2}:[0-9]{2}')
    if (punchedInTime) {
      var punchedInMessage = punchedInTime + ' ' + MY_NAME + 'さんが出勤しました。'
      postToSlack_(punchedInMessage)
      var punchedInAt = createTimestamp_(todayDate, punchedInTime)
      properties.setProperty(PROPERTY_KEY_LAST_PUNCHED_IN_AT, punchedInAt)
    }
  }

  // 退勤情報をSlackに投稿
  if (!punchedOutMessageHasPosted) {
    var punchedOutTime = todayRow.match('<td +class="start_end_timerecord( | .+)?"( | .+ )data-ht-sort-index="END_TIMERECORD" *>(.|\r|\n)+?</td>')[0].match('[0-9]{2}:[0-9]{2}')
    if (punchedOutTime) {
      var punchedOutMessage = punchedOutTime + ' ' + MY_NAME + 'さんが退勤しました。'
      postToSlack_(punchedOutMessage)
      var punchedOutAt = createTimestamp_(todayDate, punchedOutTime)
      properties.setProperty(PROPERTY_KEY_LAST_PUNCHED_OUT_AT, punchedOutAt)
    }
  }
}

/**
* プロパティからセッションを読み込みます。
* セッションが存在しない場合、空のオブジェクトを返します。
* @return {Object} セッション
*/
function loadSession_ () {
  var session = properties.getProperty(PROPERTY_KEY_KINGOFTIME_SESSION)
  return session ? JSON.parse(session) : {}
}

/**
* プロパティにセッションを保存します。
* @param {Object} session - セッション
*/
function saveSession_ (session) {
  properties.setProperty(PROPERTY_KEY_KINGOFTIME_SESSION, JSON.stringify(session))
}

/**
* セッションが生存しているであろうかどうかを判定します。
* @param {Object} session - セッション
* @param {string} session.timestamp - セッションのタイムスタンプ
* @return {boolean} セッションが生存しているであろうならtrue、それ以外はfalse
*/
function sessionWouldAlive_ (session) {
  var timestamp = moment(session.timestamp)
  timestamp.add(SESSION_TIMEOUT_MINUTES, 'm')
  var now = moment()
  return now.isBefore(timestamp)
}

/**
* KING OF TIMEにログインします。
* @return {Object} セッション
*/
function login_ () {
  var params = {
    method: 'POST',
    contentType: 'application/x-www-form-urlencoded',
    payload: {
      login_id: KINGOFTIME_ID,
      login_password: KINGOFTIME_PASSWORD,
      save_id: 1,
      page_id: '/login/login_form',
      action_id: '1',
      call_from: 'login_form'
    },
    followRedirects: false
  }
  var response = UrlFetchApp.fetch(KINGOFTIME_URL_LOGIN, params)
  var cookieSet = response.getAllHeaders()['Set-Cookie']
  var sessionId = normalizeCookie_(cookieSet)
  .filter(function (value) {
    return value.match('^SSL_JSESSIONID=.+$')
  })
  .map(function (value) {
    return value.match('^SSL_JSESSIONID=(.+)$')[1]
  })[0]
  var url = KINGOFTIME_URL_ROOT + response.getContentText().match('<meta +http-equiv="refresh" +content="0;URL=(.+)">')[1]
  var timestamp = new Date().toISOString()
  return {
    id: sessionId,
    url: url,
    timestamp: timestamp
  }
}

/**
* Cookieを正規化します。
* @param {(string|string[])} cookieSet - Cookie
* @return {string[]} Cookie
*/
function normalizeCookie_ (cookieSet) {
  var values = []
  var cookies = typeof cookieSet === 'string' ? [cookieSet] : cookieSet
  cookies.forEach(function (cookie) {
    cookie.split(';').forEach(function (value) {
      values.push(value)
    })
  })
  return values
}

/**
* KING OF TIMEからタイムカードページを取得します。
* 取得結果の解析に失敗した場合はnullを返します。
* @param {Object} session - セッション
* @param {string} session.id - セッションのID
* @param {string} session.url - セッションのURL
* @return {string} タイムカードページ
*/
function fetchTimeCardPage_ (session) {
  var cookie = [
    'sslroute=1',
    'kot_login_id=' + KINGOFTIME_ID,
    'kot_save_id_flag=1',
    'SSL_JSESSIONID=' + session.id
  ].join(';')
  var params = {
    method: 'GET',
    headers: {
      Cookie: cookie
    },
    followRedirects: true
  }
  var content = UrlFetchApp.fetch(session.url, params).getContentText()
  return content.match('<div +class="htBlock-adjastableTableF_inner" *>(.|\r|\n)+?</table>') ? content : null
}

/**
* タイムカードページから指定した日付のタイムカード行を取得します。
* @param {string} timeCardPage - タイムカードページ
* @param {Date} date - 日付
* @return {string} タイムカード行
*/
function findTimeCardRow_ (timeCardPage, date) {
  var table = timeCardPage.match('<div +class="htBlock-adjastableTableF_inner" *>((.|\r|\n)+?</table>)')[1]
  var rows = table.match(/<tr( | .+)?>(.|\r|\n)+?<\/tr>/g)
  return rows.filter(function (row) {
    return row.match('<input +name="working_date" +type="hidden" +value="' + formatDate_(date, 'yyyyMMdd') + '" *>')
  })[0]
}

/**
* Dateオブジェクトを指定したパターンでフォーマットします。
* @param {Date} date - Dateオブジェクト
* @param {string} pattern - パターン
* @return {string} フォーマットした文字列
*/
function formatDate_ (date, pattern) {
  return moment(date).format(pattern)
}

/**
* 日付と時刻からタイムスタンプを作成します。
* @param {string} date - 日付
* @param {string} time - 時刻
* @return {string} タイムスタンプ
*/
function createTimestamp_ (date, time) {
  return date + 'T' + time + ':00' + TIMEZONE_OFFSET
}

/**
* Slackにメッセージを投稿します。
* @param {string} message - メッセージ
*/
function postToSlack_ (message) {
  var params = {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    payload: '{"text":"' + message + '"}'
  }
  UrlFetchApp.fetch(WEBHOOK_URL, params)
}
