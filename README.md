MTA Turnstile Visualization
====================

I wanted to create this visualization for a few months. When I finished my [CitiBike Visualization](http://tbaldw.in/citibike), I figured I could use the same template to create a visualization for some MTA subway data. The MTA subway data, however, can be very messy. So after a lot of clean up, I was finally able to get the data ready to show a little bit of what was happening with the subway system before, during, and after Hurricane Sandy. The circles represent the number of entries into a particular station. The data aren't perfect, there's still some cleaning up to do, and I'd like to put some more effort into using a larger map to visualize all five buroughs.

Press the spacebar to pause the animation.

I used [Sketch.js](https://github.com/soulwire/sketch.js) to set up my canvas. 
I got the data here: [http://www.mta.info/developers](http://www.mta.info/developers).
Extra thanks to [Chris Whong](http://chriswhong.com/) & [Mala Hertz](http://themetrocardcollective.wordpress.com/) for making a way to connect latitude and longitude data to the turnstile data. Check out their [NYC Turnstiles project](https://github.com/louiedog98/nycturnstiles) on GitHub.

See it in action at [tbaldw.in/sandy](http://tbaldw.in/sandy).

Check out the source at [github.com/rolyatmax/mtaViz](https://github.com/rolyatmax/mtaViz/).