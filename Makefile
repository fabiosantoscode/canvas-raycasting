PATH := ./node_modules/.bin:$(PATH)

watch:
	nodemon --ignore phonegap

deploy:
	git diff --quiet || (echo "uncommitted changes!" && exit 1)
	git push dokku master

bootstrap:
	npm install
	cd phonegap && phonegap install android

build-android:
	cp -r img phonegap/www
	sed -e '/<\!--CORDOVA_SCRIPTS-->/ r cordova-scripts.html' < index.html > phonegap/www/index.html
	./node_modules/.bin/babel --presets=es2015 --out-dir phonegap/www/js js

android: build-android
	cd phonegap && phonegap run android

android-watch:
	nodemon \
		--ignore phonegap \
		--ext js,html \
		--exec 'make android'

apk: build-android
	rm -f android.apk
	rm -rf phonegap/platforms/android/assets/www/res/icon
	rm -rf phonegap/platforms/android/res/drawable-*
	rm -rf phonegap/www/splash.png
	rm -rf phonegap/www/appstore.png
	rm -rf phonegap/www/res/icon/ios/*
	rm -rf phonegap/www/img/icon.png
	cd phonegap && \
		phonegap build android --release
	jarsigner -verbose \
		-sigalg SHA1withRSA \
		-digestalg SHA1 \
		-keystore keys/keystore \
		-tsa http://timestamp.digicert.com \
		phonegap/platforms/android/build/outputs/apk/android-release-unsigned.apk \
		fabio
	echo running jarsigner just to make sure
	jarsigner -verify -verbose -certs \
		phonegap/platforms/android/build/outputs/apk/android-release-unsigned.apk
	zipalign -v 4 \
		phonegap/platforms/android/build/outputs/apk/android-release-unsigned.apk \
		android.apk
	git checkout phonegap/www
	echo created android.apk

