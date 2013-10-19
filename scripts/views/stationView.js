var mta = mta || {};

(function(){

	'use strict';


	mta.StationView = Backbone.View.extend({

		className: "station",

		// template: _.template( $('#station-template').html() ),

		initialize: function() {

			console.log('appView loaded');
		},

		render: function() {

			//var html = this.template( this.model.toJSON() );
			var element = this.buildTable( this.model.toJSON() );
			this.$el.empty().append( element );

			return this;
		},

		buildTable: function( obj ) {

			var len = mta.stations.length;
			obj = obj || data.turnstile[ this.currentStationIndex % len ];


			var content = document.createElement('div');

			var h1 = document.createElement('h1');
			h1.innerHTML = obj.name + " | " + obj.lines;
			content.appendChild(h1);

			for (var prop in obj.audits) {
				var day = obj.audits[prop];

				var h2 = document.createElement('h2');
				h2.innerHTML = prop;
				content.appendChild(h2);

				var table = document.createElement("table");
				content.appendChild(table);

				for (var prp in day) {
					var count = day[ prp ];
					if (!count) continue;

					var tr = document.createElement('tr');
					table.appendChild(tr);

					var time = document.createElement('td');
					time.innerHTML = prp;

					var newEntries = document.createElement('td');
					newEntries.innerHTML = count;

					tr.appendChild( time );
					tr.appendChild( newEntries );
					table.appendChild( tr );
				}

			}

			return content;

		}

	});

}());