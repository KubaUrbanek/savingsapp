package pl.oszczednosci.app.application.port;

import java.util.UUID;

@FunctionalInterface
public interface IdGenerator { UUID nextId(); }
