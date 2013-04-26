var MTAVIZ = MTAVIZ || {};

(function() {

	var data;

	function init() {
		var url = 'data/turnstile_130420.csv';
		var test_url = "data/test.csv";

		utils.parseCSV({
			url: url,
			callback: callback
		});

		function callback(parsed, res) {
			MTAVIZ.data = data = parsed;
			main();
		}
	}

	function main() {

		convertData();

	}

	function convertData() {
		for (var i = 0, len = data.length; i < len; i++) {
			data[i] = parse( data[i] );
		}
		return data;
	}


	//// Parses a single array from the parsed CSV file
	//// That is, data from a single turnstile

	function parse( array ) {
		var obj = {};
		
		obj.area = array.shift();
		obj.unit = array.shift();
		obj.subunit = array.shift();
		obj.audits = [];

		for (var i = 0, len = array.length; i < len; i += 5) {
			var audit = {};
			var auditNum = i / 5;

			audit.date = array[ i ];
			audit.time = array[ i + 1 ];
			audit.desc = array[ i + 2 ];
			audit.entryTotal = parseInt( array[ i + 3 ], 10);
			audit.exitTotal = parseInt( array[ i + 4 ], 10);

			//// Unless this is the first audit of the day,
			//// compute the number of new entries and exits
			if (auditNum !== 0) {
				var prevAudit = obj.audits[ auditNum - 1 ];
				audit.newEntries = audit.entryTotal - prevAudit.entryTotal;
				audit.newExits = audit.exitTotal - prevAudit.exitTotal;
			}

			obj.audits[ auditNum ] = audit;
		}
		return obj;
	}




	/////// Start it all off

	init();


}());