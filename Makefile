
watch:
	nodemon

deploy:
	git diff --quiet || (echo "uncommitted changes!" && exit 1)
	git push dokku master

