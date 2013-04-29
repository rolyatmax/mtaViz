var mta = mta || {};

(function(){

	'use strict';

	mta.Stations = Backbone.Collection.extend({

		url: 'data/turnstile.json',
		model: mta.Station,

		initialize: function() {
			console.log('stations collection loaded');
		}

	});

}());