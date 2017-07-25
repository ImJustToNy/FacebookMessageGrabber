const chat = require('facebook-chat-api')
const mysql = require('mysql')
const async = require('async')

require('dotenv').config()

const threadID = process.env.CHAT_ID

var db = mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME,
    charset: 'utf8mb4'
})

db.connect()

var timestamp = undefined

chat({
    email: process.env.FB_USERNAME,
    password: process.env.FB_PASSWORD
}, (err, api) => {
    if (err) return console.error(err)

    getMessages(api)
})

function getMessages (api) {
    console.log('Getting messages...')
    api.getThreadHistory(threadID, 50, timestamp, (err, history) => {
        if (err) return console.error(err)

        if (timestamp != undefined) history.pop()

        if (history.length > 0) {

            timestamp = history[0].timestamp

            async.every(history, (message, callback) => {
                console.log('[' + message.senderName + '] ' + ((message.attachments.length) ? message.attachments[0].largePreviewUrl : message.body))

                db.query('INSERT INTO messages SET ?', {
                    type: (message.attachments.length) ? 'media' : 'message',
                    body: message.body,
                    sender_id: message.senderID,
                    sender_name: message.senderName,
                    image_url: (message.attachments.length) ? message.attachments[0].largePreviewUrl : null,
                    image_preview: (message.attachments.length) ? message.attachments[0].thumbnailUrl : null,
                    sender_id: message.senderID,
                    sender_name: message.senderName,
                    timestamp: message.timestamp
                }, error => {
                    callback(null, !error)
                })
            }, (err, result) => {
                if (err) console.log(err)

                getMessages(api)
            })
        } else {
            console.log('We don\'t have more messages!')
            db.end()
        }
    })
}
