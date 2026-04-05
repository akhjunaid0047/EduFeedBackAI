from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.models.settings import InstitutionSettings
from app.schemas.settings import InstitutionSettingsUpdate


async def get_settings(db: AsyncSession) -> InstitutionSettings:
    result = await db.execute(select(InstitutionSettings).limit(1))
    cfg = result.scalar_one_or_none()
    if cfg is None:
        cfg = InstitutionSettings(id=1)
        db.add(cfg)
        await db.commit()
        await db.refresh(cfg)
    return cfg


async def update_settings(db: AsyncSession, data: InstitutionSettingsUpdate) -> InstitutionSettings:
    cfg = await get_settings(db)
    for k, v in data.model_dump(exclude_unset=True).items():
        setattr(cfg, k, v)
    await db.commit()
    await db.refresh(cfg)
    return cfg
