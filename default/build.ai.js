var Road = require('build_road')
var Extension = require('build_ext')
var TowerBuilder = require('build_tower')
var utils = require('utils')

const ROAD_DATA = "roadData"
const BUILD_DATA = "buildData"

const PHASE_ROADS = 0
const PHASE_EXTENSIONS = 1

const EXTENSION_OPTIONS = "eo"
const EXTENSION_OPTIONS_COUNT = "eoc"

class BuildAI {
    constructor(room) {
        this.room = room
    }

    run() {
        this.setPhase()

        new TowerBuilder(this.room).run()

        switch (Memory[BUILD_DATA][this.room.name].phase) {
            case PHASE_ROADS:
                new Road(this.room).run()
                break
            case PHASE_EXTENSIONS:
                new Extension(this.room).run()
                break
        }
    }

    setPhase() {
        if (!(ROAD_DATA in Memory)) {
            return
        }

        if (!(BUILD_DATA in Memory)) {
            Memory[BUILD_DATA] = {}
            Memory[BUILD_DATA][this.room.name].phase = PHASE_ROADS
        }

        if (Memory[ROAD_DATA][this.room.name].failedRoadBuild >= 10) {
            Memory[ROAD_DATA][this.room.name].failedRoadBuild = 0
            Memory[BUILD_DATA][this.room.name].phase = PHASE_EXTENSIONS
        }
    }
}

module.exports = BuildAI