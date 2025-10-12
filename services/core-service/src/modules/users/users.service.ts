import { Injectable, ConflictException, ForbiddenException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../prisma/prisma.service';
import { InviteDeveloperDto } from './dto/invite-developer.dto';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async inviteDeveloper(
    inviterId: string,
    organizationId: string,
    inviteDeveloperDto: InviteDeveloperDto,
  ) {
    // Check if inviter has permission (OWNER or CUSTOMER)
    const inviter = await this.prisma.user.findUnique({
      where: { id: inviterId },
    });

    if (!inviter || !['OWNER', 'CUSTOMER'].includes(inviter.role)) {
      throw new ForbiddenException('Only OWNER and CUSTOMER can invite developers');
    }

    // Check if email already exists
    const existingUser = await this.prisma.user.findUnique({
      where: { email: inviteDeveloperDto.email },
    });

    if (existingUser) {
      throw new ConflictException('User with this email already exists');
    }

    // Hash password
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(inviteDeveloperDto.password, saltRounds);

    // Create developer user
    const developer = await this.prisma.user.create({
      data: {
        email: inviteDeveloperDto.email,
        passwordHash,
        role: 'DEVELOPER',
        organizationId,
        invitedBy: inviterId,
      },
      select: {
        id: true,
        email: true,
        role: true,
        organizationId: true,
        invitedBy: true,
        createdAt: true,
      },
    });

    return developer;
  }

  async getOrganizationUsers(organizationId: string) {
    return this.prisma.user.findMany({
      where: { organizationId },
      select: {
        id: true,
        email: true,
        role: true,
        invitedBy: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  async deleteUser(userId: string, requesterId: string, organizationId: string) {
    // Check if requester has permission (OWNER or CUSTOMER)
    const requester = await this.prisma.user.findUnique({
      where: { id: requesterId },
    });

    if (!requester || !['OWNER', 'CUSTOMER'].includes(requester.role)) {
      throw new ForbiddenException('Only OWNER and CUSTOMER can delete users');
    }

    // Get target user
    const targetUser = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!targetUser || targetUser.organizationId !== organizationId) {
      throw new ForbiddenException('User not found or not in your organization');
    }

    // Prevent deleting OWNER
    if (targetUser.role === 'OWNER') {
      throw new ForbiddenException('Cannot delete organization owner');
    }

    // Delete user
    await this.prisma.user.delete({
      where: { id: userId },
    });

    return { message: 'User deleted successfully' };
  }
}


