var mta = mta || {};

(function(){

	'use strict';

	var eventsBound = false;

	mta.AppView = Backbone.View.extend({

		el: '#content',

		currentStationIndex: 0,

		initialize: function() {

			_.bindAll(this);

			this.render();
			this.bindEvents();

			console.log('appView loaded');
		},

		render: function() {
			var stations = document.createElement('div');
			stations.id = 'stations';
			this.$el.empty().append( stations );

			return this;
		},

		bindEvents: function() {
			if (eventsBound) return;

			$(document).on('keydown', this.keydown);

			eventsBound = true;

		},

		keydown: function(e) {

			var model, stationView,
				numStations = mta.stations.length;

			if (e.which == 39 || e.which == 40) { // up or left
				e.preventDefault();
				this.currentStationIndex++;

				model = mta.stations.at( this.currentStationIndex % numStations);
				stationView = new mta.StationView({ model: model });
				this.$('#stations').empty().append( stationView.render().el );

			}

			if (e.which == 37 || e.which == 38) { // down or right
				e.preventDefault();
				this.currentStationIndex--;
				if (this.currentStationIndex < 0) this.currentStationIndex = numStations - 1;

				model = mta.stations.at( this.currentStationIndex % numStations);
				stationView = new mta.StationView({ model: model });
				this.$('#stations').empty().append( stationView.render().el );
			}
		}



	});

}());