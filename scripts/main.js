var mta = mta || {};

(function() {

	'use strict';

	var content = document.getElementById("content");
	var table = document.createElement("table");
	var data = {};
	var turnstileURL = 'data/turnstile_130420.csv';
	var stationURL = 'data/Remote-Booth-Station.csv';


	function init() {

		// load in csv files, parse and save them
		var prom = loadData( turnstileURL ).then(function(parsed){
			data.turnstile = parsed;
		});

		var prom2 = loadData( stationURL ).then(function(parsed){
			data.station = parsed;
		});

		when(prom, prom2).then( main );

		// setup table
		content.appendChild(table);

	}

	function main() {

		data.station = setupStationKey( data.station );

		convertTurnstileData( data.turnstile );
		data.turnstile = combineAudits( data.turnstile );
		data.turnstile = addNewEntryData( data.turnstile );
		console.log("DONE");
	}


	function render( obj ) {

		var p = document.createElement('p');
		p.innerHTML = obj.id;
		content.appendChild(p);

		for (var i = 0, len = obj.audits.length; i < len; i++) {
			var audit = obj.audits[i];

			var tr = document.createElement('tr');

			var date = document.createElement('td');
			var time = document.createElement('td');
			var entryTotal = document.createElement('td');
			var newEntries = document.createElement('td');

			date.innerHTML = audit.date;
			time.innerHTML = audit.time;
			entryTotal.innerHTML = audit.entryTotal;
			newEntries.innerHTML = audit.newEntries || "0";

			tr.appendChild( date );
			tr.appendChild( time );
			tr.appendChild( entryTotal );
			tr.appendChild( newEntries );

			table.appendChild( tr );
		}

	}


	function loadData( url, callback ) {
		var deferred = when.defer();
		utils.parseCSV({
			url: url,
			callback: function(parsed, res) {
				deferred.resolve( parsed );
				if (callback) callback(parsed, res);
			}
		});
		return deferred.promise;
	}

	// From an array into an object
	function convertTurnstileData( array ) {
		for (var i = 0, len = array.length; i < len; i++) {
			array[i] = parse( array[i] );
		}
		return array;
	}

	function setupStationKey( array ) {

		var i, station;

		console.log(array);

		for (i = 0, len = array.length; i < len; i++) {
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
		for (i = 0, len = array.length; i < len; i++) {
			station = array[i];
			array[i] = station[0];
		}

		return array;
	}

	// The files have audits split somewhat arbitrarily.
	// So this code combines them by turnstile.
	function combineAudits( array ) {

		//// Group all the objects with the same area, unit, and subunit name
		var data = _.groupBy( array, function(t) {
			return t.area + " " + t.unit + " " + t.subunit;
		});

		//// Convert into arrays
		data = _.toArray( data );

		_.each(data, function(turnstile, i) {

			// create a new object to represent the turnstile
			// complete with id and an array of its audits
			var obj = {};
			obj.id = turnstile[0].area + ' ' + turnstile[0].unit + ' ' + turnstile[0].subunit;
			//obj.name = data.station[ turnstile[0].area ];
			obj.audits = [];
			_.each(turnstile, function(dataSet) {
				obj.audits = obj.audits.concat( dataSet.audits );
			});

			data[ i ] = obj;

		});

		return data;

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

	mta.init = init;
	mta.data = data;
	mta.render = render;

}());