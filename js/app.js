// Global Map and InfoWindow References
var map;
var infoWindow;

/* Initialize Google Map */
var Map = function() {

	if ( typeof google != 'object' || typeof google.maps != 'object') {
		// display error message
		$('.message').html('<h1>!ERROR!</h1></br><h3><b>Are you connected to the internet?</b></h3>');

		// quit
		return false;
	}
	
	// Map Settings
	var myLatLng = new google.maps.LatLng(38.9226843, -77.0194377);
	var mapOptions = {
		center: myLatLng,
		zoom: 13,
		disableDefaultUI: true
	};

	// Instantiate global map variable
	map = new google.maps.Map(document.getElementById('map-canvas'), mapOptions);

	// Instantiate global info window
	infoWindow = new google.maps.InfoWindow({
		maxWidth: 200
	});
	return true;
};

/* ViewModel */
var ViewModel = function() {

	// Reference to ViewModel
	var self = this;

	// Information about a location
	this.Location = function(title, lat, lng, keywords, street, city) {

		// Store information about the location
		this.title = ko.observable(title);
		this.street = ko.observable(street);
		this.city = ko.observable(city);
		this.keywords = ko.observableArray(keywords);
		this.lat = ko.observable(lat);
		this.lng = ko.observable(lng);
		
		// Create map marker
		this.marker = new google.maps.Marker({
			position: new google.maps.LatLng(lat, lng),
			animation: google.maps.Animation.DROP,
			title: title,
		});

		// Google Street View
		this.streetViewImg = ko.observable('<img class="bgimg" src="http://maps.googleapis.com/maps/api/streetview?size=600x400&location=' + street + ', ' + city + '">');

		// Wikipedia Links
		this.wikiInfo = ko.observable('');

		// NYTimes info
		this.nytInfo = ko.observable('');

		// Reference to current location for use in event handlers
		var temp = this;

		// Infowindow information
		this.info = ko.computed(function(){
			return '<div>'+
						'<h4>' + temp.title() + '</h4>'+
						temp.keywords().join(', ')+'<br><br>'+
						'<div class="hidden-xs hidden-sm col-md-12">'+temp.streetViewImg()+'</div>'+
						'<div><p>'+'<br>'+						
							temp.wikiInfo()+
							temp.nytInfo()+
						'</p></div>'+
					'</div>';
		});

		// Add click event to show info window
		google.maps.event.addListener(this.marker, 'click', function() {
			temp.reveal();
		});

		this.reveal = function() {
			map.setCenter(temp.marker.getPosition());
			infoWindow.setContent(temp.info());
			infoWindow.open(map, temp.marker);	
		};
		// Set marker map
		this.marker.setMap(map);
	};

	// A list of all location objects
	this.generateLocationList = function() {

		// Declare variables
		var locations = [];
		var keywords;

		// Instantiate all locations
		keywords = ['washington', 'monument', 'historic'];
		locations.push( ko.observable(new self.Location('The Washington Monument', 38.8894838, -77.0352791, keywords, '2 15th St NW', 'Washington, DC')) );

		keywords = ['Howard', 'University', 'Academics'];
		locations.push( ko.observable(new self.Location('Howard University', 38.9226843, -77.0194377, keywords, '2400 Sixth St NW', 'Washington, DC')) );

		keywords = ['Georgetown', 'University', 'Academics'];
		locations.push( ko.observable(new self.Location('Georgetown University', 38.9076089, -77.0722585, keywords, '3700 O St NW', 'Washington, DC')) );

		keywords = ['white house', 'landmark', 'president', 'historic'];
		locations.push( ko.observable(new self.Location('The White House', 38.8976763, -77.0365298, keywords, '1600 Pennsylvania Ave NW', 'Washington, DC')) );

		keywords = ['union station', 'train'];
		locations.push( ko.observable(new self.Location('Washington Union Station', 38.896993, -77.006422, keywords, '50 Massachusetts Ave NE', 'Washington, DC')) );
		
		keywords = ['capitol', 'historic', 'landmark'];
		locations.push( ko.observable(new self.Location('Capitol Hill', 38.8866936, -76.9987321, keywords, 'First Street Southeast', 'Washington, DC')) );

		keywords = ['holocaust','museum', 'historic', 'landmark'];
		locations.push( ko.observable(new self.Location('Holocaust Museum', 38.8867076, -77.0326074, keywords, '100 Raoul Wallenberg Pl SW', 'Washington, DC')) );
		return locations;
	};
	this.allLocations = ko.observable(this.generateLocationList());

	var placeholder = '';

	// Search string
	this.searchString = ko.observable(placeholder);

	// Computed observable, filtered based on searchString
	this.locations = ko.computed(function() {

		// Instantiate observable array
		var filteredLocations = ko.observableArray();

		// Determine filter from search string
		var filter = self.searchString().toLowerCase();

		// Iterate over locations
		self.allLocations().forEach(function(location) {

			// Set all location markers to be invisible
			location().marker.setVisible(false);

			// Check if title contains filter or the filter is the default string
			if ( location().title().toLowerCase().indexOf(filter) != -1 || self.searchString() === placeholder) {
				filteredLocations.push(location());
				location().marker.setVisible(true);
			}
			else {
				var words  = location().keywords();

				// Interate over all words
				for (var i = 0; i < words.length; i++) {				
					// If word contains searchString, push location
					if (words[i].toLowerCase().indexOf(filter) != -1) {
						filteredLocations.push(location());
						location().marker.setVisible(true);
						break;
					}
				}
			}
		});
		return filteredLocations();
	});
	// NYTimes information
	this.nytimes = function () {

		// NYTimes AJAX request
		var nytimesRequest = function(index) {
			var nytimesUrl = 'http://api.nytimes.com/svc/search/v2/articlesearch.json?q=' + self.locations()[index].title() + '&sort=newest&api-key=6e0cc071f0cac9c2989b52c99e4919c0:13:72494127';
			$.getJSON(nytimesUrl, function(data){

				var newNytimesInfo = self.locations()[index].nytInfo();
				newNytimesInfo = newNytimesInfo.concat('New York Times:');
				newNytimesInfo = newNytimesInfo.concat('<ul>');

				var articles = data.response.docs;
				for (var j = 0; j < articles.length; j++) {
					// display two of the most recent NYT articles on location
					if (j > 1) {
						break;
					}
					var article = articles[j];
					newNytimesInfo = newNytimesInfo.concat('<li class="article"> <a href="' + article.web_url + '">' + article.headline.main + '</a></li>');
				}

				self.locations()[index].nytInfo(newNytimesInfo);

			}).error(function(e){
				self.locations()[index].nytInfo('No article to display.<br>');
			});
		};

		// Iterate through all locations
		for (var i = 0; i < self.locations().length; i++){
			nytimesRequest(i);
		}
	};
	this.nytimes();

	// Wikipedia information
	this.wikipedia = function () {

		var wikipediaRequest = function(index) {

			// Wikipedia request error handling
			var wikiRequestTimeout = setTimeout(function(){
				self.locations()[index].wikiInfo('No Wikipedia info to dispay.<br>');
			}, 1000); // 1 second timeout error

			// Request
			$.ajax({
				url: wikiUrl,
				dataType: 'jsonp',
				success: function(response){

					// string to replace wikInfo
					var newWikiInfo = self.locations()[index].wikiInfo();
					newWikiInfo = newWikiInfo.concat('Wikipedia:');
					newWikiInfo = newWikiInfo.concat('<ul>');

					// obtain articles from reponse
					var articleList = response[1];

					for (var j = 0; j < articleList.length; j++) {
						// display up to two wikipedia articles
						if (j > 1) {
							break;
						}
						var articleStr = articleList[j];
						var url = 'http://en.wikipedia.org/wiki/' + articleStr;
						newWikiInfo = newWikiInfo.concat('<li> <a href="' + url + '">' + articleStr + '</a></li>');
					}
		            clearTimeout(wikiRequestTimeout);
					newWikiInfo = newWikiInfo.concat('</ul>');
					self.locations()[index].wikiInfo(newWikiInfo);
				}
			});
		};
		// Iterate through all locations
		for (var i = 0; i < self.locations().length; i++){
			// Wikipedia AJAX Request
			var wikiUrl = 'http://en.wikipedia.org/w/api.php?action=opensearch&search=' + self.locations()[i].title() + '&format=json&callback=wikiCallBack';
			wikipediaRequest(i);
		}
	};
	this.wikipedia();
};

// Knockout Bindings
$(function(){

	// Instantiate Map
	if ( Map() ) {

		// Apply KO bindings
		ko.applyBindings(new ViewModel());
	}
});