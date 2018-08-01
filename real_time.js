(function ()
{
	// Chris French
	// v-chrfr@microsoft.com
	// July/August 2018
	
	const DEFAULT_KEY = "*** Enter API Key HERE ***";
	const API_KEY = DEFAULT_KEY;

	function MakeCard(header, body)
	{
		let card = document.createElement('div');
		card.className = 'card';
		header.className = 'card-header';
		header.style.width = "100%";
		header.style.display = "inline-block";
		body.className = 'card-body';

		card.appendChild(header);
		card.appendChild(body);

		card.style.width = "100%";
		card.style.height = "auto";

		return card;
	}


	function RealTimeDisplayColor(time_delay)
	{
		if (time_delay == null)
		{
			return " btn-outline-secondary";
		}
		else if (0 < time_delay) // late
		{
			return " btn-outline-danger";
		}
		else
		{
			return " btn-outline-success";
		}
	}

	function ReadTime(time_string)
	{
		let time_stamp = time_string.split('/Date(')[1].split(')/')[0];
		let op = (time_stamp.indexOf('+') > -1) ? '+' : '-';
		[ordinal, offset] = time_stamp.split(op).map(Number);
		return moment(ordinal);
	}

	function BuildRoute(data)
	{
		if (data == null)
		{
			let card = MakeCard("Unable to find any routes!", "Try using a different time.");
			document.getElementById('deck').appendChild(card);

		}
		else
		{
			let route = JSON.parse(data).resourceSets[0].resources[0];
			let i = 0;

			let raw_start_time = route.routeLegs[0].startTime;
			let start_time = ReadTime(raw_start_time);
			let current_time = start_time;

			route.routeLegs[0].itineraryItems.forEach(function (item)
			{
				i++;

				let is_real_time = Boolean(item.isRealTimeTransit);
				let header = document.createElement('div');
				let body = document.createElement('div');
				let title = document.createElement('span');
				let rt_badge = document.createElement('span');
				title.style.float = "left";
				rt_badge.style.float = "right";
				rt_badge.className = 'btn';

				if (item.hasOwnProperty("childItineraryItems"))
				{
					title.innerHTML = String(i) + ": " + item.instruction.text;
					let itinerary = document.createElement('div');
					itinerary.className = 'col';
					let col = null;

					item.childItineraryItems.forEach(function (child)
					{
						let child_real_time = Boolean(child.isRealTimeTransit);
						let child_data = document.createElement('div');
						child_data.style.display = 'inline-block';
						let child_offset = Number(child.travelDuration);

						let child_time = ReadTime(child.time);

						current_time = child_time;

						let child_title = document.createElement('span');
						let child_badge = document.createElement('span');

						if (!child_real_time)
						{
							col = RealTimeDisplayColor(null);
							child_badge.innerHTML = current_time.format('LLLL');
						}
						else
						{
							let delay = Number(child.realTimeTransitDelay);
							col = RealTimeDisplayColor(delay);
							let extra = (delay > 0) ? " -- " + String(delay) + "s" : " (on time)";
							child_badge.innerHTML = current_time.format('LLLL') + extra;
						}

						rt_badge.className += col;

						child_badge.style.padding = 0;
						child_badge.className = 'btn' + col;
						child_badge.style.float = 'right';
						

						child_title.innerHTML = child.instruction.text;
						child_title.style.float = 'left';
						child_title.style.paddingRight = 30;
						child_data.style.width = '100%';

						child_data.appendChild(child_title);
						child_data.appendChild(child_badge);
						itinerary.appendChild(child_data);
					});

					body.appendChild(itinerary);
				}
				else
				{
					let col = null;
					let offset = Number(item.travelDuration);
					current_time.add(offset, 's');

					if (!is_real_time)
					{
						col = RealTimeDisplayColor(null);
						rt_badge.innerHTML = current_time.format('LLLL');
					}
					else
					{
						let delay = Number(item.realTimeTransitDelay);
						col = RealTimeDisplayColor(delay);
						let extra = (delay > 0) ? " -- " + String(delay) + "s" : " (on time)";
						rt_badge.innerHTML = current_time.format('LLLL') + extra;
					}

					rt_badge.className += col;
					let [header_content, body_content] = item.instruction.text.split(':');
					title.innerHTML = String(i) + ": " + header_content;
					body.innerHTML = body_content;
				}

				header.appendChild(title);
				rt_badge.style.padding = 0;
				header.style.width = "100%";
				rt_badge.className += ' pull-right';
				header.appendChild(rt_badge);
				let card = MakeCard(header, body);
				document.getElementById('deck').appendChild(card);
			});
		}
	}

	function GetRealTimeData()
	{
		document.getElementById('deck').innerHTML = "";
		document.getElementById('add-url').innerHTML = "";
		let begin_coords = sessionStorage.getItem('begin-coords');
		let end_coords = sessionStorage.getItem('end-coords');
		let time_div = document.getElementById('time_type');
		let time_type = time_div.options[time_div.selectedIndex].value;
		let raw_time = document.getElementById('user_time').value;
		let [hour, min] = raw_time.split(':').map(Number);
		let time = (hour + (min / 100) > 12) ? raw_time + ":00PM" : raw_time + ":00AM"; 
		let url = encodeURI("http://dev.virtualearth.net/REST/V1/Routes/Transit?" + "wp.0=" + begin_coords + "&wp.1=" + end_coords + "&dateTime=" + time + "&timeType=" + time_type + "&key=" + API_KEY);
		let tag = document.createElement('a');
		tag.href = url;
		tag.innerHTML = 'JSON Link';
		document.getElementById('add-url').appendChild(tag);
		CallRestService(url, BuildRoute);
	}


	// Get User Input
	function GetCoords(destination, coords_name)
	{
		let address = sessionStorage.getItem(destination);
		if (address != null)
		{
			ReverseAddress(address, function (data)
			{
				let coords = ReadCoordsFromJSON(data);
				sessionStorage.setItem(coords_name, coords);
			});
		}
		else
		{
			alert('Missing input field!');
		}
	}

	function CreateRoute(event)
	{
		event.preventDefault();
		Promise.resolve(true)
			.then(() => { GetCoords('begin-destination', 'begin-coords'); })
			.then(() => { GetCoords('end-destination', 'end-coords'); })
			.then(GetRealTimeData);
	}

	function ReverseAddress(address_string, callback)
	{
		let url = encodeURI("http://dev.virtualearth.net/REST/v1/Locations?query=" + address_string + "&key=" + API_KEY);
		CallRestService(url, callback);
	}

	function ReadCoordsFromJSON(data)
	{
		let obj = JSON.parse(data);
		let coords = obj.resourceSets[0].resources[0].point.coordinates;
		let coords_string = coords.join(',');
		return coords_string;
	}

	function CallRestService(request, callback)
	{
		var r = new XMLHttpRequest();
		if ('withCredentials' in r)
		{
			r.open("GET", request, false);
			r.onreadystatechange = function ()
			{
				if (r.readyState == 4 && r.status >= 200 && r.status < 400)
				{
					callback(r.responseText);
				}
				else if (r.status == 404)
				{
					callback(null);
				}
				else
				{
					alert('Bad request: ' + r.responseText);
				}
			}
		}
		r.send();
	}

	function GetTime()
	{
		d = new Date();
		d.setUTCHours(d.getHours(), d.getMinutes(), 0, 0);
		return d;
	}

	document.addEventListener(
		'DOMContentLoaded',
		function ()
		{
			if (API_KEY == DEFAULT_KEY)
			{
				alert('Remember to open `real_time.js` in an editor, change API_KEY to be equal to your Bing Maps API Key, and then save the file');
			}

			let begin_input = document.getElementById('begin-destination');
			begin_input.value = sessionStorage.getItem('begin-destination');
			begin_input.onchange = () => { sessionStorage.setItem('begin-destination', begin_input.value); }

			let end_input = document.getElementById('end-destination');
			end_input.value = sessionStorage.getItem('end-destination');
			end_input.onchange = () => { sessionStorage.setItem('end-destination', end_input.value); }

			document.getElementById('find-route').addEventListener('click', CreateRoute);

			let user_time = document.getElementById("user_time");
			user_time.valueAsDate = sessionStorage.getItem('user-time') || GetTime();
		});

})();
