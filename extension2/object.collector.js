class Collector {
    constructor(obj) {
        if (obj.type == "Creep") {
            this.creep = obj
        }

        if (obj.type == "Spawn") {
            this.spawn = obj
            var body = this.calculateBody()

            var creepName = 'P' + Game.time
            var err = this.spawn.spawnCreep(body.sort(), creepName, 
            {
                memory: {
                    role: 'P'
                }
            })

            if (err != OK) {
                console.log("P ERROR SPAWNING CREEP: " + err)
                return
            }

            var creep = Game.creeps[creepName]

            this.creep = creep
        }
    }

    run() {
        if (this.creep.memory.dropoffTarget) {
            this.dropoff()
            return
        }

        if (this.creep.memory.pickupTarget) {
            this.pickup()
            return
        }

        if (this.creep.store.getUsedCapacity() > 0) {
            let prioTarget = this.creep.room.find(FIND_STRUCTURES, {
                filter: (structure) => (structure.structureType == STRUCTURE_TOWER &&
                    structure.store.getUsedCapacity(RESOURCE_ENERGY) < (structure.store.getCapacity(RESOURCE_ENERGY) / 2))
            })
            if (prioTarget.length > 0) {
                this.creep.memory.dropoffTarget = prioTarget[0].id
                return
            }

            var target = this.creep.pos.findClosestByPath(FIND_STRUCTURES, {
                filter: (structure) => (structure.structureType == STRUCTURE_EXTENSION || structure.structureType == STRUCTURE_SPAWN || structure.structureType == STRUCTURE_TOWER
                    ) && structure.store.getFreeCapacity(RESOURCE_ENERGY) > 0
            })

            if (!target && this.creep.store.getFreeCapacity() > 0) {
                this.selectPickupTarget()
            } else {
                if (target) {
                    this.creep.memory.dropoffTarget = target.id
                }
            }
        } else {
            this.selectPickupTarget()
        }
    }

    selectPickupTarget() {
        var target = this.creep.pos.findClosestByPath(FIND_DROPPED_RESOURCES, {
            filter: (resource) => resource.resourceType == RESOURCE_ENERGY
        })
        if (target) {
            this.creep.memory.pickupTarget = target.id
        }
    }

    pickup() {
        var target = Game.getObjectById(this.creep.memory.pickupTarget)
        var err = this.creep.pickup(target)
        switch (err) {
            case ERR_NOT_IN_RANGE:
                this.creep.moveTo(target, {
                    visualizePathStyle: {
                        stroke: '#111111'
                    }
                })
                break
            case ERR_INVALID_TARGET:
            case ERR_FULL:
            case OK:
            default:
                delete this.creep.memory.pickupTarget
                break
        }
    }

    dropoff() {
        var target = Game.getObjectById(this.creep.memory.dropoffTarget)
        var err = this.creep.transfer(target, RESOURCE_ENERGY)
        switch (err) {
            case ERR_NOT_IN_RANGE:
                this.creep.moveTo(target, {
                    visualizePathStyle: {
                        stroke: '#999999'
                    }
                })
                break
            case ERR_FULL:
            case ERR_INVALID_TARGET:
            case OK:
            default:
                delete this.creep.memory.dropoffTarget
                break
        }
    }

    calculateBody() {
        var energyAvailable = this.spawn.room.energyAvailable
        var toAdd = [
            MOVE,
            MOVE,
            MOVE,
            CARRY,
            CARRY,
            CARRY,
            MOVE,
            CARRY,
            MOVE,
            MOVE,
            CARRY,
            CARRY,
            CARRY,
            MOVE,
            CARRY,
            MOVE,
            MOVE,
            CARRY,
            MOVE,
            CARRY,
            MOVE,
            MOVE
        ]
        var body = [ CARRY, MOVE ]

        var buildCost = 0
        for (var index in body) {
            buildCost += BODYPART_COST[body[index]]
        }

        for (index in toAdd) {
            var part = toAdd[index]
            if (buildCost + BODYPART_COST[part] <= energyAvailable) {
                body.push(part)
                buildCost += BODYPART_COST[part]
            } else {
                break
            }
        }

        return body
    }
}

module.exports = Collector