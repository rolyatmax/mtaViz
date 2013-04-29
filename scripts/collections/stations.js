var mta = mta || {};

(function(){

	'use strict';

	mta.Stations = Backbone.Collection.extend({

		url: 'data/turnstile.json',
		model: mta.Station,

		initialize: function() {
			console.log('stations collection loaded');
		},

		getByLine: function(line) {
			return this.filter(function(station){
				var lines = station.get('lines').split('');
				return _.indexOf(lines, line.toUpperCase()) !== -1;
			});
		}

	});

}());