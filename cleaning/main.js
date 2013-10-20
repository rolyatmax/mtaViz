var fs = require('fs');
var _und = require('./underscore');
var csv = require('csv');

var mta = mta || {};

(function() {

	'use strict';

	var urls = ['../raw/turnstile_130420.csv', '../raw/turnstile_130413.csv',
				'../raw/turnstile_130406.csv', '../raw/turnstile_130330.csv',
				'../raw/turnstile_130323.csv', '../raw/turnstile_130316.csv',
				'../raw/turnstile_130309.csv', '../raw/turnstile_130302.csv',
				'../raw/turnstile_121110.csv', '../raw/turnstile_121103.csv'];

	var data = {};
	var stationURL = '../raw/Remote-Booth-Station.csv';

	function init(turnstileURL) {

		turnstileURL = turnstileURL || urls[0];

		console.log('Loading Turnstile Data');

		fs.readFile(turnstileURL, function(err, file) {
			if (err) throw err;

			var returned = 0;

			console.log('Parsing Turnstile Data');
			csv()
				.from.string(file)
				.to.array(function(res){
					returned += 1;
					data.turnstile = res;
					if (returned === 2) main();
				});

			console.log('Loading Station Data');
			fs.readFile(stationURL, function(err, file) {
				if (err) throw err;

				console.log('Parsing Station Data');
				csv()
					.from.string(file)
					.to.array(function(res){
						returned += 1;
						data.station = res;
						if (returned === 2) main();
					});
			});

		});

	}

	function main() {

		data.station = setupStationKey( data.station );

		data.turnstile = convertTurnstileData( data.turnstile );
		data.turnstile = combineAudits( data.turnstile );
		data.turnstile = addNewEntryData( data.turnstile );
		data.turnstile = combineStations( data.turnstile );

		closeAndWrite( "../data/sorted_data.json", data.turnstile );
		closeAndWrite( "../data/station_data.json", data.station );

		console.log("DONE");
	}

	// From an array into an object
	function convertTurnstileData( array ) {
		for (var i = 0, len = array.length; i < len; i++) {
			array[i] = parse( array[i] );
		}
		return array;
	}

	function setupStationKey( array ) {

		console.log('Setting up station key');

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

		array = _und.groupBy( array, function(station) {
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

		console.log('Combine Stations');

		//// Group all the objects with the same area, unit, and subunit name
		var groups = _und.groupBy( array, function(t) {
			return t.name + " | " + t.lines;
		});

		//// Convert into arrays
		groups = _und.toArray( groups );

		_und.each(groups, function(station, i) {

			// create a new object to represent the turnstile
			// complete with id and an array of its audits
			var obj = {};
			obj.name = station[0].name;
			obj.lines = station[0].lines;
			obj.audits = [];
			_und.each(station, function(turnstile) {

				_und.each(turnstile.audits, function(audit){
					obj.audits = obj.audits.concat( audit );
				});

			});

			obj.audits = sortAuditsByTime( obj.audits );

			groups[ i ] = obj;
		});

		return groups;

	}


	function sortAuditsByTime( audits ) {

		console.log('Sort by Time');

		// sort by date first
		var dates = _und.groupBy(audits, function(audit) {
			return audit.date;
		});

		// go through each date sorting by time
		for (var prop in dates) {
			if (dates.hasOwnProperty(prop)) {
				var date = dates[ prop ];
				var times = _und.groupBy(date, function(obj) {
					return obj.time;
				});

				for (var prp in times) {
					var time = times[prp];
					var total = 0;

					_und.each(time, function(audit){
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

		console.log('Combine Audits');

		//// Group all the objects with the same area, unit, and subunit name
		var groups = _und.groupBy( array, function(t) {
			return t.area + " " + t.unit + " " + t.subunit;
		});

		//// Convert into arrays
		groups = _und.toArray( groups );

		// Deletes the final 'false' value if there is one
		if (!groups[groups.length - 1][0]) {
			groups.length -= 1;
		}

		_und.each(groups, function(turnstile, i) {

			// create a new object to represent the turnstile
			// complete with id and an array of its audits
			var obj = {};
			obj.id = turnstile[0].area + ' ' + turnstile[0].unit + ' ' + turnstile[0].subunit;
			obj.name = data.station[ turnstile[0].unit ].name;
			obj.lines = data.station[ turnstile[0].unit ].lines;
			obj.audits = [];
			_und.each(turnstile, function(dataSet) {
				obj.audits = obj.audits.concat( dataSet.audits );
			});

			groups[ i ] = obj;
		});

		return groups;

	}

	function addNewEntryData( array ) {

		console.log('Add New Entry Data');

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


	function closeAndWrite(file, data) {

		console.log('Writing files to ', file);

		fs.writeFile(file, JSON.stringify(data, null, 2), function(err) {
			if (err) throw err;
			console.log('Completed!');
		});
	}

	mta.init = init;

}());

mta.init();
