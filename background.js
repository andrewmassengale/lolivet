// called when the user clicks on the browser action
var active = false;
var notification;
var latest_fibr = { id: 0, name: '', food: '', timestamp: Date.now() };
var saved_name = '';

setInterval(checkForFibr, 15000);
checkForFibr();

function createNotification(noIcon) {
	var id = latest_fibr.id;
	var name = latest_fibr.name;
	var food = latest_fibr.food;
	var time = moment(latest_fibr.timestamp);
	var message = '';

	if (name && !food) {
		message += name + ' said there\'s food in the break room!';
	} else if (!name && food) {
		message += 'There is some ' + food + ' in the break room!';
	} else if (name && food) {
		message += name + ' said there\'s ' + food + ' in the break room!';
	} else if (id === 0) {
		message += 'There is no known food in the break room.';
	} else {
		message += 'There\'s food in the break room!';
	}
	message += '\n\n' + time.fromNow();

	notification = new Notification('FIBR Alert', {
		icon: 'img/food_icon_active128.png',
		body: message
	});

	if (!noIcon) {
		adjustIcon('on');
	}
}

function adjustIcon(status) {
	if (status === 'on') {
		chrome.browserAction.setIcon({ path: 'img/food_icon_active48.png' });
	} else {
		chrome.browserAction.setIcon({ path: 'img/food_icon_disabled48.png' });
	}
}

function addMinutes(date, minutes) {
	return date + minutes * 60000;
}

function checkForFibr() {
	var adjustedTimestamp = moment(latest_fibr.timestamp).add(10, 'minutes');
	var now = moment();

	if (now.isAfter(adjustedTimestamp)) {
		adjustIcon('off');
	}

	$.ajax({
		url: 'http://mxdev.rsna.org/amassengale/fibr_api/?check_fibr',
		type: 'GET',
		cache: false,
		success: function (data) {
			var data_array = data.split(',');
			var id = parseInt(data_array[0]);
			var name = decodeURI(data_array[1]);
			var food = decodeURI(data_array[2]);
			food = food.replace(/{comma}/g, ',');

			if (latest_fibr.id !== id) {
				latest_fibr.id = id;
				latest_fibr.name = name;
				latest_fibr.food = food;
				latest_fibr.timestamp = Date.now();

				if (id !== 0) {
					createNotification();
				} else {
					adjustIcon('off');
				}
			}
		}
	});
}

function sendFibr(name, food, idOverride, cb) {
	name = encodeURI(name);
	food = encodeURI(food);
	food = food.replace(/,/g, '{comma}');
	var id = (idOverride === 0) ? 0 : latest_fibr.id + 1;

	if (name !== '') saved_name = name;

	$.ajax({
		url: 'http://mxdev.rsna.org/amassengale/fibr_api/?send_fibr&id=' + id + '&name=' + name + '&food=' + food,
		type: 'GET',
		cache: false,
		success: function () { if (cb) cb(); }
	});
}

chrome.runtime.onMessage.addListener(function (request) {
	switch (request.message) {
		case 'send_fibr':
			sendFibr(request.name, request.food, null, checkForFibr);
			break;
		case 'clear_fibr':
			sendFibr('', '', 0, checkForFibr);
			break;
		case 'get_name':
			chrome.runtime.sendMessage({ 'message': 'name', 'name': saved_name });
			break;
		case 'refresh_fibr':
			createNotification(true);
			break;
	}
});

chrome.runtime.onInstalled.addListener(function () {
	chrome.tabs.create({ url: 'http://mxdev.rsna.org/amassengale/fibr/' });
});