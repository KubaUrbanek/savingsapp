package pl.oszczednosci.app.application.port.out;

import java.util.UUID;

@FunctionalInterface
public interface IdGenerator { UUID nextId(); }
