var mta = mta || {};

(function(){

	'use strict';

	//// Setup Info Section
	new Info({
		url: "README.md",
		keyTrigger: true
	});

	$('#parseAndSaveData').on('click', function(e){
		mta.parseAndSaveData();
	});

	mta.stations = new mta.Stations();

	mta.stations.fetch().then(function(){

		mta.appView = new mta.AppView();

	});

}());