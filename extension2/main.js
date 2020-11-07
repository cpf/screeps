var utils = require('utils')
var Harvester = require('object.harvester')
var Collector = require('object.collector')
var Upgrader = require('object.upgrader')
var BuildAI = require('build.ai')
var Builder = require('object.builder')
var Repairer = require('object.repair')
const Tower = require('object.tower')

Creep.prototype.type = "Creep"
StructureSpawn.prototype.type = "Spawn"

module.exports.loop = function () {
    var spawn = Game.spawns['HQ']
    var room = spawn.room

    utils.cleanup(room)
    utils.pushRoomSourceMemory(room)

    new BuildAI(room).run()

    let towers = room.find(FIND_MY_STRUCTURES, {
        filter: (structure) => structure.structureType == STRUCTURE_TOWER
    })
    for (var index in towers) {
        new Tower(towers[index], room).run()
    }

    var harvesters = _.filter(Game.creeps, (creep) => creep.memory.role == 'H')
    for (var index in harvesters) {
        new Harvester(harvesters[index]).run()
    }
    
    var collectors = _.filter(Game.creeps, (creep) => creep.memory.role == 'P')
    for (var index in collectors) {
        new Collector(collectors[index]).run()
    }

    var upgraders = _.filter(Game.creeps, (creep) => creep.memory.role == 'U')
    for (var index in upgraders) {
        new Upgrader(upgraders[index]).run()
    }

    var builders = _.filter(Game.creeps, (creep) => creep.memory.role == 'B')
    for (var index in builders) {
        new Builder(builders[index]).run()
    }

    let repairers = _.filter(Game.creeps, (creep) => creep.memory.role == 'R')
    for (let index in repairers) {
        new Repairer(repairers[index]).run()
    }

    var roomInfo = Memory.rooms[room.name]
    var desiredHarvesters = 0
    for (var index in roomInfo.sources) {
        var sourceInfo = roomInfo.sources[index]
        desiredHarvesters += sourceInfo.targetHarvesters
    }

    if (harvesters.length < desiredHarvesters && !spawn.spawning) {
        new Harvester(spawn)
        return
    }

    var droppedResources = room.find(FIND_DROPPED_RESOURCES)
    if (droppedResources.length >= 2 && collectors.length * 4 < droppedResources.length && !spawn.spawning) {
        new Collector(spawn)
        return
    }

    if (upgraders.length < 10 && room.energyAvailable == room.energyCapacityAvailable && !spawn.spawning) {
        new Upgrader(spawn)
        return
    }

    if (repairers.length < 2 && !spawn.spawning) {
        new Repairer(spawn)
        return
    }

    if (builders.length < room.find(FIND_MY_CONSTRUCTION_SITES).length && !spawn.spawning) {
        new Builder(spawn)
        return
    }
}