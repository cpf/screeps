class Repairer {
    constructor(obj) {
        if (obj.type == "Creep") {
            this.creep = obj
        }

        if (obj.type == "Spawn") {
            this.spawn = obj
            var body = this.calculateBody()

            var creepName = 'R' + Game.time
            var err = this.spawn.spawnCreep(body.sort(), creepName, 
            {
                memory: {
                    role: 'R'
                }
            })

            if (err != OK) {
                console.log("R ERROR SPAWNING CREEP: " + err)
                return
            }

            var creep = Game.creeps[creepName]

            this.creep = creep

            this.creep.memory.lastCheck = Game.time
            this.creep.memory.lastTickRepair = false
        }
    }

    run() {
        if ("lastCheck" in this.creep.memory) {
            if (this.creep.memory.lastCheck < Game.time - 10 && this.creep.memory.repairing && !this.creep.memory.lastTickRepair) {
                let target = Game.getObjectById(this.creep.memory.repairTarget)
                if (target.hits == target.hitsMax) {
                    this.resetRepair()
                }

                this.creep.memory.lastCheck = Game.time
            }
        }
        if (this.creep.memory.repairing) {
            this.repair()
        } else if (this.creep.memory.pickupTarget) {
            this.withdraw()
        } else {
            this.selectPickupTarget()
        }
    }

    withdraw() {
        if (this.creep.store.getFreeCapacity() == 0) {
            this.selectRepairTarget()
            if (this.creep.memory.repairTarget) {
                this.creep.memory.repairing = true
                return
            }
        }

        var target = Game.getObjectById(this.creep.memory.pickupTarget)
        var err = this.creep.withdraw(target, RESOURCE_ENERGY)
        switch (err) {
            case ERR_NOT_IN_RANGE:
                this.creep.moveTo(target, {
                    visualizePathStyle: {
                        stroke: '#ffcccc'
                    }
                })
                break
            case ERR_INVALID_TARGET:
            case ERR_FULL:
            case ERR_INVALID_ARGS:
            case OK:
            default:
                delete this.creep.memory.pickupTarget
                break
        }
    }

    repair() {
        let target = Game.getObjectById(this.creep.memory.repairTarget)
        let err = this.creep.repair(target)
        switch (err) {
            case ERR_NOT_IN_RANGE:
                this.creep.moveTo(target, {
                    visualizePathStyle: {
                        stroke: '#ffcccc'
                    }
                })
                this.creep.memory.lastTickRepair = false
                break
            case ERR_INVALID_TARGET:
                console.log("Repair invalid target " + target)
            case ERR_NO_BODYPART:
            case ERR_NOT_ENOUGH_RESOURCES:
            case ERR_BUSY:
                this.resetRepair()
                this.creep.memory.lastTickRepair = false
                break
            case OK:
                this.creep.memory.lastTickRepair = true
                if (target.hits == target.hitsMax) {
                    this.resetRepair()
                }
            default:
                break
        }
    }

    resetRepair() {
        delete this.creep.memory.repairTarget

        if (this.creep.store.getUsedCapacity() > 0) {
            // Just select a new repair target
            this.selectRepairTarget()
            return
        }

        this.creep.memory.repairing = false
    }

    selectPickupTarget() {
        var target = this.creep.pos.findClosestByPath(FIND_STRUCTURES, {
            filter: (structure) => (structure.structureType == STRUCTURE_EXTENSION || structure.structureType == STRUCTURE_SPAWN
                    ) && structure.store.getUsedCapacity(RESOURCE_ENERGY) > 0
        })

        if (target) {
            this.creep.memory.pickupTarget = target.id
        }
    }

    selectRepairTarget() {
        var prioTargets = this.creep.room.find(FIND_STRUCTURES, {
            filter: (structure) => structure.structureType != STRUCTURE_CONTROLLER && structure.hits < (structure.hitsMax / 2)
        })

        if (prioTargets.length > 0) {
            this.creep.memory.repairTarget = prioTargets[0].id
            this.creep.say("prio")
            return
        }

        var medioTargets = this.creep.room.find(FIND_STRUCTURES, {
            filter: (structure) => structure.structureType != STRUCTURE_CONTROLLER && structure.hits < (structure.hitsMax - (structure.hitsMax / 3))
        })

        if (medioTargets.length > 0) {
            this.creep.memory.repairTarget = medioTargets[0].id
            this.creep.say("medio")
            return
        }

        var targets = this.creep.room.find(FIND_STRUCTURES, {
            filter: (structure) => structure.structureType != STRUCTURE_CONTROLLER && structure.hits < (structure.hitsMax - 100)
        })

        if (targets.length > 0) {
            this.creep.memory.repairTarget = targets[0].id
            this.creep.say("normal")
            return
        }

        this.creep.suicide()
    }

    calculateBody() {
        var energyAvailable = this.spawn.room.energyAvailable
        var toAdd = [
            MOVE,
            CARRY,
            CARRY,
            MOVE,
            WORK,
            CARRY,
            WORK,
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
        var body = [ WORK, CARRY, MOVE ]

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

module.exports = Repairer