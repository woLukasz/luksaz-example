/*
 Libraries that we need
 */
const config = require('config');
const crypto = require('crypto');
const express = require('express');
const https = require('https');
const request = require('request');
const bodyParser = require('body-parser');
/*
 Some Facebook API configuration
 */
const APP_SECRET = process.env.MESSENGER_APP_SECRET;
const VALIDATION_TOKEN = process.env.MESSENGER_VALIDATION_TOKEN;
const PAGE_ACCESS_TOKEN = process.env.MESSENGER_PAGE_ACCESS_TOKEN;

/*
 Configure our HTTP server
 */
var app = express();
app.set('port', process.env.PORT || 3000);
app.use(bodyParser.json());


/*
 Here we specify API endpoints that Facebook can call
 */


/*
 * Use your own validation token. Check that the token used in the Webhook 
 * setup is the same token used here.
 *
 */
app.get('/webhook', function (req, res) {
	const hubMode = req.query['hub.mode'];
	const verifyToken = req.query['hub.verify_token'];
	
	console.log(hubMode);
	console.log('provided token', verifyToken);
	console.log('config token', VALIDATION_TOKEN);
	
	if (hubMode === 'subscribe' &&
		verifyToken === VALIDATION_TOKEN) {
		console.log("Validating webhook");
		res.status(200).send(req.query['hub.challenge']);
	} else {
		console.error("Failed validation. Make sure the validation tokens match.");
		res.sendStatus(403);
	}
});

/*
 * All callbacks for Messenger are POST-ed. They will be sent to the same
 * webhook. Be sure to subscribe your app to your page to receive callbacks
 * for your page. 
 * https://developers.facebook.com/docs/messenger-platform/product-overview/setup#subscribe_app
 *
 */
app.post('/webhook', function (req, res) {
	var data = req.body;
	
	try {
		console.log('Facebook sent us:', JSON.stringify(data, null, ' '));
		// Make sure this is a page subscription
		if (data.object == 'page') {
			// Iterate over each entry
			// There may be multiple if batched
			data.entry.forEach(function (pageEntry) {
				var pageID = pageEntry.id;
				var timeOfEvent = pageEntry.time;
				
				// Iterate over each messaging event
				pageEntry.messaging.forEach(function (messagingEvent) {
					
					const senderID = messagingEvent.sender.id;
					const isIncoming = pageID != senderID;
					const message = messagingEvent.message.text;
					
					if(isIncoming){
						const messageFromUser = 'test';
						const reply = `Hi, you said "${message}"`;
						sendTextMessage(senderID,reply);
					}

				});
			});
		}
	}
	catch (error) {
		console.log(error);
	}
	
	// Assume all went well.
	//
	// You must send back a 200, within 20 seconds, to let us know you've
	// successfully received the callback. Otherwise, the request will time out.
	res.sendStatus(200);
});

/*
 * Send a text message using the Send API.
 *
 */
function sendTextMessage(recipientId, messageText) {
	var messageData = {
		recipient: {
			id: recipientId
		},
		message: {
			text: messageText,
			metadata: "DEVELOPER_DEFINED_METADATA"
		}
	};
	
	callSendAPI(messageData);
}

/*
 * Call the Send API. The message data goes in the body. If successful, we'll 
 * get the message id in a response 
 *
 */
function callSendAPI(messageData) {
	request({
		uri: 'https://graph.facebook.com/v2.8/me/messages',
		qs: {access_token: PAGE_ACCESS_TOKEN},
		method: 'POST',
		json: messageData
		
	}, function (error, response, body) {
		if (!error && response.statusCode == 200) {
			var recipientId = body.recipient_id;
			var messageId = body.message_id;
			
			if (messageId) {
				console.log("Successfully sent message with id %s to recipient %s",
					messageId, recipientId);
			} else {
				console.log("Successfully called Send API for recipient %s",
					recipientId);
			}
		} else {
			console.error("Failed calling Send API", response.statusCode, response.statusMessage, body.error);
		}
	});
}

/*
 Start our server
 */
app.listen(app.get('port'), function () {
	console.log('Node app is running on port', app.get('port'));
});

module.exports = app;