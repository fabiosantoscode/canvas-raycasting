
watch:
	nodemon --ignore phonegap

deploy:
	git diff --quiet || (echo "uncommitted changes!" && exit 1)
	git push dokku master

bootstrap-phonegap:
	cd phonegap/platforms/android
	npm install

android:
	cp -r img phonegap/www
	sed -e '/<\!--CORDOVA_SCRIPTS-->/ r cordova-scripts.html' < index.html > phonegap/www/index.html
	./node_modules/.bin/babel --presets=es2015 --out-dir phonegap/www/js js
	cd phonegap && phonegap run android

android-watch:
	nodemon \
		--ignore phonegap \
		--ext js,html \
		--exec 'make android'

