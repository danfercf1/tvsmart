var browser = new function(){
	this.selectedChannel;

	this.ItemsLimit = 100;
	this.ColoumnsCount = 4;

	this.MODE_NONE = -1;
	this.MODE_ALL = 0;
	this.MODE_GAMES = 1;
	this.MODE_GAMES_STREAMS = 2;
	this.MODE_GO = 3;

	this.modeINIT = this.MODE_ALL;
	this.gameSelected = null;
	this.itemsCount = 0;
	this.cursorX = 0;
	this.cursorY = 0;

	this.ime = null;

	this.loadingData = false;
	this.loadingDataTryMax = 15;
	this.loadingDataTry;
	this.loadingDataTimeout;
	this.dataEnded = false;


	this.lang;
	tizen.systeminfo.getPropertyValue(
		"LOCALE",
		function (locale) {
			lang = locale.language;
			browser.initLanguage(lang);
		},
		function (error) {
			console.log(error);
		}
	);

	this.ScrollHelper =
	{
		documentVerticalScrollPosition: function()
		{
			if (self.pageYOffset) return self.pageYOffset; // Firefox, Chrome, Opera, Safari.
			if (document.documentElement && document.documentElement.scrollTop) return document.documentElement.scrollTop; // Internet Explorer 6 (standards mode).
			if (document.body.scrollTop) return document.body.scrollTop; // Internet Explorer 6, 7 and 8.
			return 0; // None of the above.
		},

		viewportHeight: function()
		{ return (document.compatMode === "CSS1Compat") ? document.documentElement.clientHeight : document.body.clientHeight; },

		documentHeight: function()
		{ return (document.height !== undefined) ? document.height : document.body.offsetHeight; },

		documentMaximumScrollPosition: function()
		{ return this.documentHeight() - this.viewportHeight(); },

		elementVerticalClientPositionById: function(id)
		{
			var element = document.getElementById(id);
			var rectangle = element.getBoundingClientRect();
			return rectangle.top;
		},

		/**
		 * For public use.
		 *
		 * @param id The id of the element to scroll to.
		 * @param padding Top padding to apply above element.
		 */
		scrollVerticalToElementById: function(id, padding)
		{
			var element = document.getElementById(id);
			if (element == null)
			{
				console.warn('Cannot find element with id \''+id+'\'.');
				return;
			}

			var targetPosition = this.documentVerticalScrollPosition() + this.elementVerticalClientPositionById(id) - 0.25 * this.viewportHeight() - padding;

			$(window).scrollTop(targetPosition);
		}
	};

	this.logging = function(msg){

		var logging = $('#logging');

		if (msg != '') {
			logging.html(logging.html() + '<br />' + msg);
			console.log('[Logs]: ', msg);
		} else {
			logging.html('');
		}

		//logsEl.scrollTop = logsEl.scrollHeight;
	};

	this.addCommas = function (nStr)
	{
		nStr += '';
		x = nStr.split('.');
		x1 = x[0];
		x2 = x.length > 1 ? '.' + x[1] : '';
		var rgx = /(\d+)(\d{3})/;
		while (rgx.test(x1)) {
			x1 = x1.replace(rgx, '$1' + ',' + '$2');
		}
		return x1 + x2;
	};

	this.sleep = function(millis, callback){
		setTimeout(function()
			{ callback(); }
			, millis);
	};

	this.createCell = function(row_id, coloumn_id, data_name, thumbnail, title, info, info2, info_fill)
	{
		var infostyle;

		if (info_fill)
		{
			infostyle = 'style="right: 0;"';
		}
		else
		{
			infostyle = 'style="right: 20%;"';
		}

		return $('<td id="cell_' + row_id + '_' + coloumn_id + '" class="stream_cell" data-channelname="' + data_name + '"></td>').html(
			'<img id="thumbnail_' + row_id + '_' + coloumn_id + '" class="stream_thumbnail" src="' + thumbnail + '"/> \
			<div class="stream_text" ' + infostyle + '> \
			<div class="stream_title">' + title + '</div> \
			<div class="stream_info">' + info + '</div> \
            <div class="stream_info">' + info2 + '</div> \
            </div>');
	};

	this.createCellEmpty = function()
	{
		return $('<td class="stream_cell"></td>').html('');
	};

	this.loadDataError = function()
	{
		this.loadingDataTry++;
		if (this.loadingDataTry < this.loadingDataTryMax)
		{
			if (this.loadingDataTry < 10)
			{
				this.loadingDataTimeout += 100;
			}
			else
			{
				switch (this.loadingDataTry)
				{
					case 10:
						this.loadingDataTimeout = 5000;
						break;
					case 11:
						this.loadingDataTimeout = 10000;
						break;
					case 12:
						this.loadingDataTimeout = 30000;
						break;
					case 13:
						this.loadingDataTimeout = 60000;
						break;
					default:
						this.loadingDataTimeout = 300000;
						break;
				}
			}
			this.loadDataRequest();

		}
		else
		{
			this.loadingData = false;
			this.showDialog("Error: Unable to load stream data.");
		}
	};

	this.loadDataSuccess = function(responseText)
	{
		//var response = $.parseJSON(responseText);

		var response = responseText;

		var response_items;
		if (this.modeINIT === this.MODE_GAMES)
		{
			response_items = response.top.length;
		}
		else
		{
			response_items = response.streams.length;
		}

		if (response_items < this.ItemsLimit)
		{
			this.dataEnded = true;
		}

		var offset = this.itemsCount;
		this.itemsCount += response_items;

		var response_rows = response_items / this.ColoumnsCount;
		if (response_items % this.ColoumnsCount > 0)
		{
			response_rows++;
		}

		var cursor = 0;

		var t;
		for (var i = 0; i < response_rows; i++)
		{
			var row_id = offset / this.ColoumnsCount + i;
			var row = $('<tr></tr>');

			for (t = 0; t < this.ColoumnsCount && cursor < response_items; t++, cursor++)
			{
				var cell;

				if (this.modeINIT == this.MODE_GAMES)
				{
					var game = response.top[cursor];

					cell = this.createCell(row_id, t, game.game.name, game.game.box.large, game.game.name, this.addCommas(game.viewers) + ' Viewers' , '', true);
				}
				else
				{
					var stream = response.streams[cursor];

					cell = this.createCell(row_id, t, stream.channel.name, stream.preview.medium, stream.channel.status, stream.channel.display_name, this.addCommas(stream.viewers) + ' Viewers', false);
				}

				row.append(cell);
			}

			for (; t < this.ColoumnsCount; t++)
			{
				row.append(this.createCellEmpty());
			}

			$('#stream_table').append(row);
		}

		this.sleep(2000, function() {
			browser.showTable();
			browser.addFocus();
			browser.loadingData = false;
		});
	};

	this.loadDataRequest = function()
	{

		try
		{
			var dialog_title = "";

			if (this.loadingDataTry > 0)
			{
				dialog_title = STR_RETRYING + " (" + (this.loadingDataTry + 1) + "/" + this.loadingDataTryMax + ")";
			}
			this.showDialog(dialog_title);

			var theUrl;

			var offset = this.itemsCount;

			if (this.modeINIT === this.MODE_GAMES)
			{
				theUrl = 'https://api.twitch.tv/kraken/games/top?limit=' + this.ItemsLimit + '&offset=' + offset;
			}
			else if (this.modeINIT === this.MODE_GAMES_STREAMS)
			{
				theUrl = 'https://api.twitch.tv/kraken/streams?game=' + encodeURIComponent(this.gameSelected) + '&limit=' + this.ItemsLimit + '&offset=' + offset;
			}
			else
			{
				theUrl = 'https://api.twitch.tv/kraken/streams?limit=' + this.ItemsLimit + '&offset=' + offset;

			}

			jQuery.ajax({
				url: theUrl,
				async: false,
				method: "GET"
			}).done(function (result) {
				browser.loadDataSuccess(result);
			}).fail(function(){
			}).always(function(result) {
			});
		}
		catch (error)
		{
			this.loadDataError();
		}
	};

	this.loadData = function()
	{
		// Even though loading data after end is safe it is pointless and causes lag
		if ((this.itemsCount % this.ColoumnsCount != 0) || this.loadingData)
		{
			return;
		}

		this.loadingData = true;
		this.loadingDataTry = 0;
		this.loadingDataTimeout = 500;

		this.loadDataRequest();
	};

	this.showDialog = function(title)
	{
		$(".overlay").show();
		$("#streamname_frame").hide();
		$("#stream_table").hide();
		$("#dialog_loading_text").text(title);
	};

	this.showTable = function()
	{
		$(".overlay").hide();
		$("#streamname_frame").hide();
		$("#stream_table").show();

		this.ScrollHelper.scrollVerticalToElementById('thumbnail_' + this.cursorY + '_' + this.cursorX, 0);
	};

	this.showInput = function()
	{
		$(".overlay").hide();
		$("#stream_table").hide();
		$("#streamname_frame").show();
	};

	this.switchMode = function(mode)
	{
		if (mode != this.modeINIT)
		{
			this.modeINIT = mode;

			$("#tip_icon_channels").removeClass('tip_icon_active');
			$("#tip_icon_games").removeClass('tip_icon_active');
			$("#tip_icon_open").removeClass('tip_icon_active');
			$("#tip_icon_refresh").removeClass('tip_icon_active');

			if (mode == this.MODE_ALL)
			{
				$("#tip_icon_channels").addClass('tip_icon_active');
				this.refresh();
			}
			else if (mode == this.MODE_GAMES)
			{
				$("#tip_icon_games").addClass('tip_icon_active');
				this.refresh();
			}
			else if (mode == this.MODE_GAMES_STREAMS)
			{
				$("#tip_icon_games").addClass('tip_icon_active');
				this.refresh();
			}
			else if (mode == this.MODE_GO)
			{
				$("#tip_icon_open").addClass('tip_icon_active');
				this.clean();
				this.showInput();
				this.refreshInputFocus();
			}
		}else{
			if(channel.go){
				this.refresh();
			}

		}
	};

	this.clean = function()
	{
		$('#stream_table').empty();
		this.itemsCount = 0;
		this.cursorX = 0;
		this.cursorY = 0;
		this.dataEnded = false;
	};

	this.refresh = function()
	{
		if (this.modeINIT != this.MODE_GO)
		{
			this.clean();

			this.loadData();
		}
	};


	this.removeFocus = function()
	{
		$('#thumbnail_' + this.cursorY + '_' + this.cursorX).removeClass('stream_thumbnail_focused');
	};

	this.addFocus = function()
	{
		if (this.cursorY + 5 > this.itemsCount / this.ColoumnsCount
			&& !this.dataEnded)
		{
			this.loadData();
		}

		$('#thumbnail_' + this.cursorY + '_' + this.cursorX).addClass('stream_thumbnail_focused');

		this.ScrollHelper.scrollVerticalToElementById('thumbnail_' + this.cursorY + '_' + this.cursorX, 0);
	};

	this.getCellsCount = function(posY)
	{
		return Math.min(
			this.ColoumnsCount,
			this.itemsCount - posY * this.ColoumnsCount);
	};

	this.getRowsCount = function()
	{
		var count = this.itemsCount / this.ColoumnsCount;
		if (this.itemsCount % this.ColoumnsCount > 0)
		{
			count++;
		}

		return count;
	};

	this.refreshInputFocus = function()
	{
		$('#streamname_input').removeClass('channelname');
		$('#streamname_input').removeClass('channelname_focused');
		$('#streamname_button').removeClass('button_go');
		$('#streamname_button').removeClass('button_go_focused');

		if (this.cursorY == 0)
		{
			$('#streamname_input').addClass('channelname_focused');
			$('#streamname_button').addClass('button_go');
		}
		else
		{
			$('#streamname_input').addClass('channelname');
			$('#streamname_button').addClass('button_go_focused');
		}
	};

	this.openStream = function()
	{
		$(window).scrollTop(0);
		scene = 'channel';
		//this.clean();
		$('#browser').hide();
		//channel.showDialog();
		channel.go = true;
		channel.init();
	};


	this.initLanguage = function (lang)
	{
		var lang_selecc = this.langSearch(lang);
		STR_CHANNELS = language[lang_selecc].STR_CHANNELS;
		STR_GAMES = language[lang_selecc].STR_GAMES;
		STR_OPEN = language[lang_selecc].STR_OPEN;
		STR_REFRESH = language[lang_selecc].STR_REFRESH;
		STR_PLACEHOLDER_OPEN = language[lang_selecc].STR_PLACEHOLDER_OPEN;
		STR_RETRYING = language[lang_selecc].STR_RETRYING;

		$('.label_channels').html(STR_CHANNELS);
		$('.label_games').html(STR_GAMES);
		$('.label_open').html(STR_OPEN);
		$('.label_refresh').html(STR_REFRESH);
		$('.label_placeholder_open').attr("placeholder", STR_PLACEHOLDER_OPEN);
	};

	this.langSearch = function(lang){
		var list = list_lang;
		var result;
		for (var i = 0; i < list.length; i++){
			if(lang.indexOf(list[i]) >= 0){
				result = list[i];
			}
		}
		return result;
	};


	this.init = function ()
	{
		$('#browser').show();

		this.registerKeyHandler();

		//initLanguage();

		this.loadingData = false;

		$("#tip_icon_channels").addClass('tip_icon_active');

		this.loadData();

		this.switchMode(this.MODE_ALL);

	};


	this.handleShow = function (data)
	{
		//alert("handleShow()");
		// this function will be called when the scene manager show this scene
	};

	this.handleHide = function ()
	{
		//alert("handleHide()");
		// this function will be called when the scene manager hide this scene
		this.clean();
	};

	this.handleFocus = function ()
	{
		//alert("handleFocus()");
		// this function will be called when the scene manager focus this scene
		this.refresh();
	};

	this.handleBlur = function ()
	{
		//alert("handleBlur()");
		// this function will be called when the scene manager move focus to another scene from this scene
	};

	this.registerKeyHandler = function() {

		/*tizen.tvinputdevice.getSupportedKeys()
		 .forEach(function (k){
		 browser.logging('Subscribed key:' + k.name + ' - ' + k.code);
		 });*/

		tizen.tvinputdevice.getSupportedKeys()
			.forEach(function (k){
				if ([
						'ChannelUp',
						'ChannelDown',
						'ColorF0Red',
						'ColorF1Green',
						'ColorF2Yellow',
						'ColorF3Blue',
					].indexOf(k.name) > -1) {
					tizen.tvinputdevice.registerKey(k.name);
					//browser.logging('Subscribed key:' + k.name + ' - ' + k.code);
				}
			});

		document.addEventListener(
			'keydown', function (e) {
				//this.logging(e.keyCode);
				if(scene == 'browser'){
					switch (e.keyCode) {
						//Return
						case 10009:
							if (browser.modeINIT === browser.MODE_GAMES_STREAMS && !browser.loadingData)
							{
								browser.switchMode(browser.MODE_GAMES);
								return;
							}
							break;
						//Izquierda
						case 37:
							if (browser.modeINIT != browser.MODE_GO)
							{
								if (browser.cursorX > 0)
								{
									browser.removeFocus();
									browser.cursorX--;
									browser.addFocus();
								}
							}
							break;
						//Derecha
						case 39:
							if (browser.modeINIT != browser.MODE_GO)
							{
								if (browser.cursorX < browser.getCellsCount(browser.cursorY) - 1)
								{
									browser.removeFocus();
									browser.cursorX++;
									browser.addFocus();
								}
							}
							break;
						//Arriba
						case 38:
							if (browser.modeINIT != browser.MODE_GO)
							{
								if (browser.cursorY > 0)
								{
									browser.removeFocus();
									browser.cursorY--;
									browser.addFocus();
								}
							}
							else
							{
								browser.cursorY = 0;
								browser.refreshInputFocus();
							}
							break;
						//Abajo
						case 40:
							if (browser.modeINIT != browser.MODE_GO)
							{
								if (browser.cursorY < browser.getRowsCount() - 1
									&& browser.cursorX < browser.getCellsCount(browser.cursorY + 1))
								{
									browser.removeFocus();
									browser.cursorY++;
									browser.addFocus();
								}
							}
							else
							{
								browser.cursorY = 1;
								browser.refreshInputFocus();
							}
							break;
						//Entrar
						case 13:
							if (browser.modeINIT == browser.MODE_GO)
							{
								if (browser.cursorY == 0)
								{
									browser.ime = new IMEShell_Common();
									browser.ime.inputboxID = 'streamname_input';
									browser.ime.inputTitle = 'Channel name';
									browser.ime.setOnCompleteFunc = onCompleteText;
									browser.ime.onShow();
								}
								else
								{
									browser.selectedChannel = $('#streamname_input').val();
									browser.openStream();
								}
							}
							else if (browser.modeINIT == browser.MODE_GAMES)
							{
								browser.gameSelected = $('#cell_' + browser.cursorY + '_' + browser.cursorX).attr('data-channelname');
								browser.modeINIT = browser.MODE_GAMES_STREAMS;
								browser.refresh();
							}
							else
							{
								browser.selectedChannel = $('#cell_' + browser.cursorY + '_' + browser.cursorX).attr('data-channelname');
								browser.openStream();
							}
							break;
						case 403:
							browser.switchMode(browser.MODE_ALL);
							break;
						case 404:
							browser.switchMode(browser.MODE_GAMES);
							break;
						case 405:
							browser.switchMode(browser.MODE_GO);
							break;
						case 406:
							browser.refresh();
							break;
						default:
							alert("handle default key event, key code(" + e.keyCode + ")");
							break;
					}
				}else{

					if (channel.state != channel.STATE_PLAYING)
					{
						switch (e.keyCode) {
							case 10009:
								channel.shutdownStream();
								break;
						}
					}
					else
					{
						switch (e.keyCode) {
							//CH - Arriba
							case 427:
								if (channel.isPanelShown() && channel.qualityIndex > 0)
								{
									channel.qualityIndex--;
									channel.qualityDisplay();
								}
								break;
							//CH - Abajo
							case 428:
								if (channel.isPanelShown()
									&& channel.qualityIndex < channel.getQualitiesCount() - 1)
								{
									channel.qualityIndex++;
									channel.qualityDisplay();
								}
								break;
							//IZQ
							case 37:
								channel.showPanel();
								break;
							//DER
							case 39:
								channel.hidePanel();
								break;
							/*case sf.key.UP:
							 break;
							 case sf.key.DOWN:
							 break;
							 */
							//Entrar
							case 13:
								if (channel.isPanelShown())
								{
									channel.qualityChanged();
								}
								else
								{
									channel.showPanel();
								}
								break;
							//Return

							case 10009:
								if (channel.isPanelShown())
								{
									channel.hidePanel();
								}
								else
								{
									channel.shutdownStream();
								}
								break;
							default:
								alert("handle default key event, key code(" + e.keyCode + ")");
								break;
						}
					}

				}
			}
		);
	};
};