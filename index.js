const chat = require('facebook-chat-api')
const mysql = require('mysql')

require('dotenv').config()

const threadID = process.env.CHAT_ID

let db = mysql.createConnection({
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

            history.forEach((message) => {
                if (message.attachments.length) {
                    message.attachments.forEach((attachment) => {
                        console.log('[' + message.senderName + '] attachment')
                        db.query('INSERT INTO messages SET ?', {
                            type: attachment.type,
                            image_url: attachment.largePreviewUrl,
                            image_preview: attachment.thumbnailUrl,
                            sender_id: message.senderID,
                            sender_name: message.senderName,
                            timestamp: message.timestamp
                        })
                    })
                } else {
                    console.log('[' + message.senderName + '] ' + message.body)
                    db.query('INSERT INTO messages SET ?', {
                        type: 'message',
                        body: message.body,
                        sender_id: message.senderID,
                        sender_name: message.senderName,
                        timestamp: message.timestamp
                    })
                }
            }).then(() => {
                getMessages(api)
            })
        } else {
            console.log('We don\'t have more messages!')
            db.end()
        }
    })
}
