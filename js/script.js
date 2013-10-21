// The Main JS File

/////// TO DO
/// =========
///  * remove Brooklyn data



(function(){

	var mta = {};

	mta.data_urls = ["data/sorted_turnstile_121103.json", "data/sorted_turnstile_121110.json"];
	mta.dates = '10-27-12 10-28-12 10-29-12 10-30-12 10-31-12 11-01-12 11-02-12 11-03-12 11-04-12 11-05-12 11-06-12 11-07-12 11-08-12 11-09-12'.split(' ');

	var width = 960;
	var height = 1150;

	////// Setup the map

	(function(){

		var proj = d3.geo.albers()
			.scale( 850000 )
			.translate([-249500, 59150]);

		var $map = $('<canvas>').attr('height', height).attr('width', width);
		$('#container').append($map);
		var map = $map[0].getContext('2d');

		var canvas = d3.select('canvas')
			.attr('width', width)
			.attr('height', height)
			.attr('class', 'map');

		d3.json('shapefiles/manhattan_roads.json', function(err, manhattan) {

			$('#curtain').css({ opacity: 0 });
			// because I can't get ontransitionend to work well cross browser (thanks Safari)
			setTimeout(function() {
				$('#curtain').remove();
			}, 1000);

			$('canvas').css({ opacity: 1 });

			var path = d3.geo.path()
				.projection( proj )
				.context( map );

			map.draw = function() {
				map.save();
				map.rotate( 13.4 * Math.PI/180 ); // doing this to approximate the rotation of true North/South
				path( topojson.feature(manhattan, manhattan.objects.manhattan_roads) );
				map.strokeStyle = 'rgba(0,0,0,0.6)';
				map.stroke();
				map.restore();
			};

			map.draw();

		});

	})();



	////// Setup the visualization

	var viz = (function(){

		var viz = Sketch.create({
			height: height,
			width: width,
			container: document.getElementById('container'),
			autopause: false,
			autostart: false,
			fullscreen: false
		});

		var stations_data = [];

		viz.setup = function() {

			var station_url = "data/station_data.json";
			var data_urls = mta.data_urls;

			mta.turnstileData = [];
			var promises = [];

			promises.push( $.getJSON(station_url).then(function(data){
				stations_data = data;
			}) );

			for (var i = 0, len = data_urls.length; i < len; i++) {
				promises.push( $.getJSON(data_urls[i]).then(function(data){

					_.each(mta.turnstileData, function(station){
						var toAugment = _.findWhere(data, { id: station.id });
						if (!station.audits || !toAugment || !toAugment.audits) return;
						station.audits = _.extend( station.audits, toAugment.audits );
					});

					if (!mta.turnstileData.length) mta.turnstileData = data;

				}) );
			}

			$.when.apply($, promises).then(function(){
				mta.stations = _.map(stations_data, function(station){
					return new Station(station);
				});

				viz.start();
			});

		};

		var dates = mta.dates;
		var hours = '0 4 8 12 16 20'.split(' ');

		var date_i = 0;
		var hour_i = 0;

		var lastSec = 0;
		var curSlice;
		var date;
		var hour;

		var SPEED = 1.5;

		viz.update = function() {
			var sec = SPEED * (viz.millis / 1000) | 0;

			if (sec > lastSec) {
				lastSec = sec;
				hour_i += 1;

				// reset hours and days once they reach the end
				if (hour_i >= hours.length) {
					hour_i = 0;
					date_i += 1;
				}
				if (date_i >= dates.length) {
					date_i = 0;
				}

				date = dates[ date_i ];
				hour = hours[ hour_i ];

				_.each(mta.stations, function(station){
					station.update( date, hour );
				});

				updateTimeDisplay( date, hour );
			}

		};

		viz.draw = function() {
			viz.save();

			_.each(mta.stations, function(station) {
				station.draw(viz);
			});

			viz.restore();
		};

		var $timeslice = $('.timeslice');

		function updateTimeDisplay( date, hour ) {

			var text = date + ' | ' + convertHour(hour);

			$timeslice.text( text );
		}

		function convertHour(hour) {
			hour = parseInt(hour, 10);

			if (hour === 0) {
				return '12AM';
			}
			if (hour < 12) {
				return hour + 'AM';
			}
			if (hour === 12) {
				return '12PM';
			}
			return (hour - 12) + 'PM';
		}

		return viz;
	})();


	///// Station Class

	var Station = (function(){

		var ANIM_SPEED = 0.04;
		var RADIUS_MAX = 80;

		var Station = function( data ) {

			var loc = convertCoords(data.latitude, data.longitude);

			this.x = loc.x;
			this.y = loc.y;
			this.name = data.name;
			this.id = data.id;
			this.entries = 1;
			this.target_r = 1;
			this.animating = false;
			this.r = this.entries;

			var station_data = _.findWhere(mta.turnstileData, { id: this.id });

			if (!station_data) return this;

			this.audits = station_data.audits;
		};

		Station.prototype = {

			update: function( date, hour ) {
				if (!date || !hour || !this.audits) return;

				var date_data = this.audits[ date ];
				if (!date_data) return;
				var entries = date_data[ hour ];

				this.entries = entries || 0;
				this.target_r = entries / 500; // scale down the circles with higher numbers
				if (this.target_r < 0) this.target_r = 0;
				if (this.target_r > RADIUS_MAX) this.target_r = RADIUS_MAX;
			},

			draw: function(ctx) {

				var delta = this.target_r - this.r;
				this.r += delta * ANIM_SPEED;

				ctx.beginPath();
				ctx.arc(this.x, this.y, this.r, 0, 2 * Math.PI, false);
				ctx.fillStyle = "rgba(255, 0, 0, 0.3)";
				ctx.fill();
			}

		};

		function convertCoords(lt, lg) {
			// this is the latitude-to-1px ratio
			var lat_norm = 0.00006647679324893937;

			// this is the longitude-to-1px ratio
			var long_norm = 0.00008936170212765288;

			// the lat/long coords for (0,0) on the canvas
			var zeroLat = 40.77040194092827;
			var zeroLong = -74.02529787234042;

			var dlat = zeroLat - lt;
			var y = dlat / lat_norm;

			var dlong = lg - zeroLong;
			var x = dlong / long_norm;

			return {
				x: x | 0,
				y: y | 0
			};
		}

		return Station;

	})();




	function toggleAnimation() {
		var action = viz.running ? 'stop' : 'start';
		viz[action]();
	}

	////// Events

	$(document).on('keydown', function(e){
		if (e.which === 32) {
			e.preventDefault();
			toggleAnimation();
		}
	});

	$('body').on('click', '.info_btn', function(e){
		toggleAnimation();
	});

	/////// Exports

	window.viz = viz;

})();