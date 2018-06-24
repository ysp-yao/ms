.PHONY: default Release Debug clean

default: Release

Release:
	gcc -g main.c -o test.out `pkg-config --cflags --libs gstreamer-1.0` -fpermissive

Debug:
	cd worker && ./scripts/configure.py
	$(MAKE) BUILDTYPE=Debug -C worker/out

xcode:
	cd worker && ./scripts/configure.py --format=xcode

clean:
	$(RM) -rf worker/out
	$(RM) -rf worker/mediasoup-worker.xcodeproj
	$(RM) -rf worker/deps/*/*.xcodeproj
