Next.js/Node backend + Python solver service

Best overall for speed of building + solver maturity.

Python has the most mature optimization ecosystem (OR-Tools first-class support, easier experimentation, easier debugging).

You run it as a separate service:

Node/Next API → sends a “solve request” JSON

Python returns solution + score breakdown + diagnostics

Why this wins

Clean separation of concerns

You can scale solver workers independently

You can iterate solver logic without touching UI code

Downside

Two runtimes (Node + Python), but in practice it’s manageable.

+ postgress db on docker