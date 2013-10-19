var fs = require('fs');
var _und = require('underscore');

var mta = mta || {};

(function() {

	'use strict';

	var urls = ['raw/turnstile_130420.csv', 'raw/turnstile_130413.csv',
				'raw/turnstile_130406.csv', 'raw/turnstile_130330.csv',
				'raw/turnstile_130323.csv', 'raw/turnstile_130316.csv',
				'raw/turnstile_130309.csv', 'raw/turnstile_130302.csv',
				'raw/turnstile_121110.csv', 'raw/turnstile_121103.csv'];

	var data = {};
	var stationURL = 'raw/Remote-Booth-Station.csv';

	function init(turnstileURL) {

		turnstileURL = turnstileURL || 'raw/turnstile_130420.csv';

		// load in csv files, parse and save them
		var prom = loadData( turnstileURL ).then(function(parsed){
			data.turnstile = parsed;
		});

		var prom2 = loadData( stationURL ).then(function(parsed){
			data.station = parsed;
		});

		$.when(prom, prom2).then( main );
	}

	function main() {

		data.station = setupStationKey( data.station );

		data.turnstile = convertTurnstileData( data.turnstile );
		data.turnstile = combineAudits( data.turnstile );
		data.turnstile = addNewEntryData( data.turnstile );
		data.turnstile = combineStations( data.turnstile );


		console.log("DONE");
	}


	function loadData( url, callback ) {
		var deferred = $.Deferred();
		utils.parseCSV({
			url: url,
			callback: function(parsed, res) {
				deferred.resolve( parsed );
				if (callback) callback(parsed, res);
			}
		});
		return deferred.promise();
	}

	// From an array into an object
	function convertTurnstileData( array ) {
		for (var i = 0, len = array.length; i < len; i++) {
			array[i] = parse( array[i] );
		}
		return array;
	}

	function setupStationKey( array ) {

		var station;

		for (var i = 0, len = array.length; i < len; i++) {
			var entry = array[i];

			station = {};
			station.area = entry[0];
			station.name = entry[2];
			station.lines = entry[3];

			array[i] = station;
		}

		array.splice(0,1);

		array = _.groupBy( array, function(station) {
			return station.area;
		});

		// there can be more than one name per area (Whitehall & South Ferry share an area)
		// there can also be more than one area per name (Times Sq has multiple areas)
		// here we just take the name of the first entry of each area
		for (var prop in array) {
			if (array.hasOwnProperty(prop)) {
				array[prop] = array[prop][0];
			}
		}

		return array;
	}


	// The files have audits split somewhat arbitrarily.
	// So this code combines them by turnstile.
	function combineStations( array ) {

		//// Group all the objects with the same area, unit, and subunit name
		var groups = _.groupBy( array, function(t) {
			return t.name + " | " + t.lines;
		});

		//// Convert into arrays
		groups = _.toArray( groups );

		_.each(groups, function(station, i) {

			// create a new object to represent the turnstile
			// complete with id and an array of its audits
			var obj = {};
			obj.name = station[0].name;
			obj.lines = station[0].lines;
			obj.audits = [];
			_.each(station, function(turnstile) {

				_.each(turnstile.audits, function(audit){
					obj.audits = obj.audits.concat( audit );
				});

			});

			obj.audits = sortAuditsByTime( obj.audits );

			groups[ i ] = obj;
		});

		return groups;

	}


	function sortAuditsByTime( audits ) {

		// sort by date first
		var dates = _.groupBy(audits, function(audit) {
			return audit.date;
		});

		// go through each date sorting by time
		for (var prop in dates) {
			if (dates.hasOwnProperty(prop)) {
				var date = dates[ prop ];
				var times = _.groupBy(date, function(obj) {
					return obj.time;
				});

				for (var prp in times) {
					var time = times[prp];
					var total = 0;

					_.each(time, function(audit){
						if (audit.newEntries && audit.desc === "REGULAR") {
							total += audit.newEntries;
						}
					});

					times[prp] = total;

				}

				dates[ prop ] = times;

			}
		}

		return dates;

	}


	// The files have audits split somewhat arbitrarily.
	// So this code combines them by turnstile.
	function combineAudits( array ) {

		//// Group all the objects with the same area, unit, and subunit name
		var groups = _.groupBy( array, function(t) {
			return t.area + " " + t.unit + " " + t.subunit;
		});

		//// Convert into arrays
		groups = _.toArray( groups );

		// Deletes the final 'false' value if there is one
		if (!groups[groups.length - 1][0]) {
			groups.length -= 1;
		}

		_.each(groups, function(turnstile, i) {

			// create a new object to represent the turnstile
			// complete with id and an array of its audits
			var obj = {};
			obj.id = turnstile[0].area + ' ' + turnstile[0].unit + ' ' + turnstile[0].subunit;
			obj.name = data.station[ turnstile[0].unit ].name;
			obj.lines = data.station[ turnstile[0].unit ].lines;
			obj.audits = [];
			_.each(turnstile, function(dataSet) {
				obj.audits = obj.audits.concat( dataSet.audits );
			});

			groups[ i ] = obj;
		});

		return groups;

	}

	function addNewEntryData( array ) {

		for (var i = 0, len = array.length; i < len; i++) {

			var turnstile = array[i];
			var audits = turnstile.audits;

			for (var p = 0, leng = audits.length; p < leng; p++) {

				//// Unless there are no previous audits for this turnstile,
				//// compute the number of new entries and exits
				//// and mix that data into the obj
				if (p !== 0) {
					var audit = audits[p];
					var prevAudit = audits[ p - 1 ];
					audit.newEntries = audit.entryTotal - prevAudit.entryTotal;
					audit.newExits = audit.exitTotal - prevAudit.exitTotal;
				}
			}
		}

		return array;
	}


	//// Parses a single array from the parsed CSV file
	//// That is, data from a single turnstile

	function parse( array ) {
		var obj = {};

		obj.area = array.shift();
		obj.unit = array.shift();
		obj.subunit = array.shift();
		obj.audits = [];

		if (obj.area === "") return false;

		for (var i = 0, len = array.length; i < len; i += 5) {
			var audit = {};
			var auditNum = i / 5;

			audit.date = array[ i ];
			audit.time = array[ i + 1 ];
			audit.desc = array[ i + 2 ];
			audit.entryTotal = parseInt( array[ i + 3 ], 10);
			audit.exitTotal = parseInt( array[ i + 4 ], 10);

			obj.audits[ auditNum ] = audit;
		}
		return obj;
	}


	/////// Exports

	mta = {
		init: init,
		data: data,
		urls: urls
	};

}());