var channel = new function(){
	this.loadingDataTryMax = 15;
	this.loadingDataTry;
	this.loadingDataTimeout;

	this.playingTryMax = 10;
	this.playingTry;
	this.playingUrl;

	this.STATE_LOADING_TOKEN = 0;
	this.STATE_LOADING_PLAYLIST = 1;
	this.STATE_PLAYING = 2;
	this.state = this.STATE_LOADING_TOKEN;

	this.QualityAuto = "Auto";
	this.quality = "High";
	this.qualityPlaying = this.quality;
	this.qualityPlayingIndex = 2;
	this.qualityIndex;
	this.qualities;

	this.tokenResponse;
	this.playlistResponse;

	this.streamInfoTimer = null;

	this.go = false;

	tizen.systeminfo.getPropertyValue(
		"LOCALE",
		function (locale) {
			lang = locale.language;
			channel.initLanguage(lang);
		},
		function (error) {
			console.log(error);
		}
	);
	
	this.listener = {
			onbufferingstart : function() {
				console.log("Buffering start.");
				channel.showLoading();
			},
			onbufferingprogress : function(percent) {
				//console.log("Buffering progress data : " + percent);
				if(typeof percent == "number"){
					channel.updateLoading(percent);
				}
				console.log(percent);
			},
			onbufferingcomplete : function() {
				console.log("Buffering complete.");
				channel.showPlayer();
			},
			oncurrentplaytime : function(currentTime) {
				console.log("Current Playtime : " + currentTime);
				channel.updateCurrentTime(currentTime);
			},
			onevent : function(eventType, eventData) {
				console.log("event type : " + eventType + ", data: " + eventData);
			},
			onerror : function(eventType) {
				console.log("error type : ");
				console.log(eventType);
			},
			onsubtitlechange : function(duration, text, data3, data4) {
				console.log("Subtitle Changed.");
			},
			ondrmevent : function(drmEvent, drmData) {
				console.log("DRM callback: " + drmEvent + ", data: " + drmData);
			},
			onstreamcompleted : function() {
				console.log("Stream Completed");
				//You should write stop code in onstreamcompleted.
				webapis.avplay.pause();
				webapis.avplay.seekTo(0);
				channel.shutdownStream();
			}
		};

	function extractStreamDeclarations(input)
	{
	  var result = [];

	  var myRegexp = /#EXT-X-MEDIA:(.)*\n#EXT-X-STREAM-INF:(.)*\n(.)*/g;
	  var match;
	  while (match = myRegexp.exec(input))
	  {
	    result.push(match[0]);
	  }

	  return result;
	}
	function extractQualityFromStream(input)
	{
	  var myRegexp = /#EXT-X-MEDIA:.*NAME=\"(\w+)\".*/g;
	  var match = myRegexp.exec(input);

		var quality;
		if (match !== null)
		{
			quality = match[1];
		}
		else
		{
			var values = input.split("\n");
			values = values[0].split(":");
			values = values[1].split(",");
			
			var set = {};
			for(var i = 0; i<values.length; i++) {
				var value = values[i].split("=");
				set[value[0]] = value[1].replace(/"/g, '');
			}
			quality = set.NAME;
		}
		return quality;
	}
	function extractUrlFromStream(input)
	{
		return input.split("\n")[2];
	}
	function extractQualities(input)
	{
	  var result = [ ];

	  var streams = extractStreamDeclarations(input);
	  for (var i = 0; i < streams.length; i++)
	  {
	    result.push({
	        'id' : extractQualityFromStream(streams[i]),
	        'url' : extractUrlFromStream(streams[i])
	    });
	  }

	  return result;
	}

	function sleep(millis, callback) {
	    setTimeout(function()
	            { callback(); }
	    , millis);
	}

	this.shutdownStream = function()
	{
		this.stopVideo();
		this.closeVideo();
		this.handleHide();
		$(window).scrollTop(0);
		scene = 'browser';
		$('#channel').hide();
		$("#browser").show();
		$("#pluginObjectPlayer").css('display','none');
		browser.switchMode(browser.modeINIT);
	};

	this.getQualitiesCount = function()
	{
		return this.qualities.length + 1;
	};

	this.qualityDisplay = function()
	{
		//$('#funciona').html(this.qualityIndex);
		if (this.qualityIndex == 0)
		{
			$('#quality_arrow_up').css({ 'opacity' : 0.2 });
			$('#quality_arrow_down').css({ 'opacity' : 1.0 });
		}
		else if (this.qualityIndex == this.getQualitiesCount() - 1)
		{
			$('#quality_arrow_up').css({ 'opacity' : 1.0 });
			$('#quality_arrow_down').css({ 'opacity' : 0.2 });
		}
		else
		{
			$('#quality_arrow_up').css({ 'opacity' : 1.0 });
			$('#quality_arrow_down').css({ 'opacity' : 1.0 });
		}
		
		if (this.qualityIndex == 0)
		{
			this.quality = this.QualityAuto;
		}
		else
		{
			this.quality = this.qualities[this.qualityIndex - 1].id;
		}
		
		$('#quality_name').text(this.quality);
	};

	this.init = function ()
	{	
		$('#channel').show();
		this.showPlayer();
		this.handleFocus();
	};

	this.handleShow = function (data) {
		alert("channel.handleShow()");
	};

	this.handleHide = function () {
		window.clearInterval(this.streamInfoTimer);
	};

	this.handleFocus = function () {
		/*this.Player = document.getElementById('pluginObjectPlayer');
		this.Player.OnConnectionFailed = 'this.onConnectionFailed';
	    this.Player.OnAuthenticationFailed = 'this.onAuthenticationFailed';
	    this.Player.OnStreamNotFound = 'this.onStreamNotFound';
	    this.Player.OnNetworkDisconnected = 'this.onNetworkDisconnected';
	    this.Player.OnRenderError = 'this.onRenderError';
	    this.Player.OnRenderingComplete = 'this.onRenderingComplete';
	    this.Player.OnBufferingComplete = 'this.onBufferingComplete';
	    this.Player.OnBufferingStart = 'this.onBufferingStart';
	    this.Player.OnBufferingProgress = 'this.onBufferingProgress';*/
	    
	    this.hidePanel();
	    $('#stream_info_name').text(browser.selectedChannel);
		$("#stream_info_title").text("");
		$("#stream_info_viewer").text("");
		$("#stream_info_icon").attr("src", "");
		this.updateStreamInfo();
	    
	    this.streamInfoTimer = window.setInterval(this.updateStreamInfo, 10000);
	    
	    //this.Player.SetDisplayArea(0, 0, 1280, 720);
	    
	    this.tokenResponse = 0;
	    this.playlistResponse = 0;
	    this.playingTry = 0;
	    this.state = this.STATE_LOADING_TOKEN;
	    
	    this.loadData();
	};

	this.disableScreenSaver = function () {
		webapis.appcommon.setScreenSaver(0, function(){});
	};

	this.enableScreenSaver = function () {
		webapis.appcommon.setScreenSaver(1, function(){});
	};

	this.onConnectionFailed = function () {
		if (this.playingTry++ < this.playingTryMax)
		{
			this.showDialog(STR_RETRYING + " (" + this.playingTry + "/" + this.playingTryMax + ")");
			this.videoOpen(this.playingUrl + '|COMPONENT=HLS');
			this.playVideo();
		}
		else
		{
			this.showDialog(STR_ERROR_CONNECTION_FAIL);
		}
	};

	this.onAuthenticationFailed = function () {
		this.showDialog(STR_ERROR_AUTHENTICATION_FAIL);
	};

	this.onStreamNotFound = function () {
		this.showDialog(STR_ERROR_STREAM_NOT_FOUND);
	};

	this.onNetworkDisconnected = function () {
		this.showDialog(STR_ERROR_NETWORK_DISCONNECT);
		this.shutdownStream();
	};

	this.onRenderError = function (RenderErrorType)
	{
		if (this.quality == "High"
			|| this.quality == "Medium"
			|| this.quality == "Low")
		{
			this.showDialog(STR_ERROR_RENDER_FIXED);
		}
		else
		{
			this.showDialog(STR_ERROR_RENDER_SOURCE);
		}
	};

	this.onBufferingStart = function () {
		this.showDialog(STR_BUFFERING);
	};

	this.onBufferingProgress = function (percent) {
		this.showDialog(STR_BUFFERING + ": " + percent + "%");
	};

	this.onBufferingComplete = function () {
		//this.showPlayer();
	};


	this.qualityChanged = function()
	{
		this.showDialog("");
		this.playingUrl = 'http://usher.twitch.tv/api/channel/hls/' + browser.selectedChannel + '.m3u8?type=any&sig=' + this.tokenResponse.sig + '&token=' + escape(this.tokenResponse.token);
		this.qualityIndex = 0;
		
		for (var i = 0; i < this.qualities.length; i++)
		{
			if (this.qualities[i].id === this.quality)
			{
				this.qualityIndex = i + 1;
				this.playingUrl = this.qualities[i].url;
				break;
			}
		}
		
		if (this.qualityIndex == 0)
		{
			this.quality = this.QualityAuto;
		}

		this.qualityPlaying = this.quality;
		this.qualityPlayingIndex = this.qualityIndex;
		this.videoOpen(this.playingUrl);
		//$('#pluginObjectPlayer').show();
		this.prepare();
		this.playVideo();
	};
	
	this.prepare = function() {
		try{
			this.showDialog("");
			console.log("Current state: " + webapis.avplay.getState());
			console.log("prepare start");
			//prepare API should be done after open API. 
			webapis.avplay.prepare();	
			//set default position and size
			//setDisplayRect should be done to display video. without it, video is not shown.		
			var avPlayerObj = document.getElementById("pluginObjectPlayer");	
			webapis.avplay.setDisplayRect(avPlayerObj.offsetLeft, avPlayerObj.offsetTop, avPlayerObj.offsetWidth, avPlayerObj.offsetHeight);
			console.log("Current state: " + webapis.avplay.getState());
			console.log("prepare complete");
			
			//duration can be get after prepare complete
			//this.updateDuration();
		}
		catch(e){
			console.log("Current state: " + webapis.avplay.getState());
			console.log(e);
		}
	};
	
	this.videoOpen = function(url) {
		try{
			console.log("Current state: " + webapis.avplay.getState());
			console.log("open start");
			//open API gets target URL. URL validation is done in prepare API.
			webapis.avplay.open(url);
			//setListener should be done before prepare API. Do setListener after open immediately.
			webapis.avplay.setListener(this.listener);
			console.log("Current state: " + webapis.avplay.getState());
			console.log("open complete");
			//reset duration
			//this.updateDuration();
		}
		catch(e){
			console.log("Current state: " + webapis.avplay.getState());
			console.log("Exception: " + e.name);
		}
	};
	
	this.prepareAsync = function() {
		try{
			console.log("Current state: " + webapis.avplay.getState());
			console.log("prepareAsync Start");
			//prepare API should be done after open API. 
			webapis.avplay.prepareAsync(function(){
				//set default position and size
				//setDisplayRect should be done to display video. without it, video is not shown.		
				var avPlayerObj = document.getElementById("pluginObjectPlayer");	
				webapis.avplay.setDisplayRect(avPlayerObj.offsetLeft, avPlayerObj.offsetTop, avPlayerObj.offsetWidth, avPlayerObj.offsetHeight);
				
				console.log("Current state: " + webapis.avplay.getState());
				console.log("prepareAsync Success");
				
				//duration can be get after prepare complete
				updateDuration();	
			}, function(e){
				console.log("Current state: " + webapis.avplay.getState());
				console.log("prepareAsync Fail");
				console.log(e);			
			});	
		}
		catch(e){
			console.log("Current state: " + webapis.avplay.getState());
			console.log(e);
		}
	};
	
	this.playVideo = function() {
		console.log("Current state: " + webapis.avplay.getState());
		console.log('Play Video');

		try {
			webapis.avplay.play();
			console.log("Current state: " + webapis.avplay.getState());
			browser.logging($('#pluginObjectPlayer').css('display'));
			this.disableScreenSaver();
		} catch (e) {
			console.log("Current state: " + webapis.avplay.getState());
			console.log(e);
		}

	};
	
	this.closeVideo = function() {
		console.log("Current state: " + webapis.avplay.getState());
		console.log('Close Video');
		try {
			webapis.avplay.close();
			console.log("Current state: " + webapis.avplay.getState());
		} catch (e) {
			console.log("Current state: " + webapis.avplay.getState());
			console.log(e);
		}

	};
	
	this.stopVideo = function() {
		console.log("Current state: " + webapis.avplay.getState());
		console.log('Stop Video');
		try {
			webapis.avplay.stop();
			this.enableScreenSaver();
			console.log("Current state: " + webapis.avplay.getState());
		} catch (e) {
			console.log("Current state: " + webapis.avplay.getState());
			console.log(e);
		}	
	};

	this.updateDuration = function(){
		//duration is given in millisecond
		var duration = webapis.avplay.getDuration();
		document.getElementById("totalTime").innerHTML = Math.floor(duration/3600000) + ":" + Math.floor((duration/60000)%60) + ":" + Math.floor((duration/1000)%60);
	};

	this.updateCurrentTime = function(currentTime){
		//current time is given in millisecond
		if(currentTime == null){
			currentTime = webapis.avplay.getCurrentTime();
		}
		document.getElementById("currentTime").innerHTML = Math.floor(currentTime/3600000) + ":" + Math.floor((currentTime/60000)%60) + ":" + Math.floor((currentTime/1000)%60);
	};

	/*
	 * Handling loading indicator
	 */
	this.showLoading = function(){
		var avPlayerObj = document.getElementById("pluginObjectPlayer");
		document.getElementById("loading").style.display = "block";
		document.getElementById("loading").style.left = avPlayerObj.offsetLeft + (avPlayerObj.offsetWidth/2) - (document.getElementById("loading").offsetWidth);
		document.getElementById("loading").style.top = avPlayerObj.offsetTop + (avPlayerObj.offsetHeight/2) - (document.getElementById("loading").offsetHeight/2);
		document.getElementById("percent").innerHTML = 0;
	};

	this.hideLoading = function(){
		document.getElementById("loading").style.display = "none";
	};

	this.updateLoading = function(percent){
		document.getElementById("percent").innerHTML = percent;
	};

	this.showDialog = function(title)
	{
		//$("#scene_channel_dialog_loading_text").text(title);
		$(".overlay").show();
	};

	this.showPlayer = function()
	{
		$(".overlay").css('display','none');
		$("#pluginObjectPlayer").css('display','inline-block');
		this.hideLoading();
	};

	function addCommas(nStr)
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
	}

	this.updateStreamInfo = function()
	{
		jQuery.ajax({
	        url: 'https://api.twitch.tv/kraken/streams/' + browser.selectedChannel,
	        async: false,
	        method: "GET",
	    }).done(function (result) {
	    	$("#stream_info_title").text(result.stream.channel.status);
			$("#stream_info_viewer").text(addCommas(result.stream.viewers) + ' ' + STR_VIEWER);
			$("#stream_info_icon").attr("src", result.stream.channel.logo);
        }).fail(function(){
        }).always(function(result) {
        });
	};

	this.showPanel = function()
	{
		this.qualityDisplay();
		$("#scene_channel_panel").show();
	};

	this.hidePanel = function()
	{
		$("#scene_channel_panel").hide();
		this.quality = this.qualityPlaying;
		this.qualityIndex = this.qualityPlayingIndex;
	};

	this.isPanelShown = function()
	{
		return $("#scene_channel_panel").is(":visible");
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
			this.showDialog("Error: Unable to retrieve access token.");
		}
	};

	this.loadDataSuccess = function(responseText)
	{
		this.showDialog("");
		
		if (this.state == this.STATE_LOADING_TOKEN)
		{
			this.tokenResponse = responseText;
			this.state = this.STATE_LOADING_PLAYLIST;
			this.loadData();
		}
		else if (this.state == this.STATE_LOADING_PLAYLIST)
		{
			this.playlistResponse = responseText;
			this.qualities = extractQualities(this.playlistResponse);
			this.state = this.STATE_PLAYING;
			this.qualityChanged();
		} 
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
			if (this.state == this.STATE_LOADING_TOKEN)
			{
				theUrl = 'http://api.twitch.tv/api/channels/' + browser.selectedChannel + '/access_token';
			}
			else
			{
				theUrl = 'http://usher.twitch.tv/api/channel/hls/' + browser.selectedChannel + '.m3u8?type=any&sig=' + this.tokenResponse.sig + '&token=' + escape(this.tokenResponse.token) + '&allow_source=true';
			}

			jQuery.ajax({
		        url: theUrl,
		        async: false,
		        method: "GET"
		    }).done(function (result) {
		    	channel.loadDataSuccess(result);
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
		this.loadingDataTry = 0;
		this.loadingDataTimeout = 500;
		
		this.loadDataRequest();
	};

	this.initLanguage = function (lang)
	{
		var lang_selecc = this.langSearch(lang);
		STR_QUALITY = language[lang_selecc].STR_QUALITY;
		STR_VIEWER = language[lang_selecc].STR_VIEWER;
		STR_BUFFERING = language[lang_selecc].STR_BUFFERING;
		STR_ERROR_RENDER_SOURCE = language[lang_selecc].STR_ERROR_RENDER_SOURCE;
		STR_ERROR_RENDER_FIXED = language[lang_selecc].STR_ERROR_RENDER_FIXED;
		STR_ERROR_NETWORK_DISCONNECT = language[lang_selecc].STR_ERROR_NETWORK_DISCONNECT;
		STR_ERROR_STREAM_NOT_FOUND = language[lang_selecc].STR_ERROR_STREAM_NOT_FOUND;
		STR_ERROR_AUTHENTICATION_FAIL = language[lang_selecc].STR_ERROR_AUTHENTICATION_FAIL;
		STR_ERROR_CONNECTION_FAIL = language[lang_selecc].STR_ERROR_CONNECTION_FAIL;

		$('#label_quality').html(STR_QUALITY);
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
};