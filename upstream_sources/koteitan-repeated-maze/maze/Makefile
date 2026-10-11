SUBDIRS = counter-pump counter-pump-3 minsky-doubling

all: $(SUBDIRS)

$(SUBDIRS):
	$(MAKE) -C $@

clean:
	for d in $(SUBDIRS); do $(MAKE) -C $$d clean; done

.PHONY: all clean $(SUBDIRS)
